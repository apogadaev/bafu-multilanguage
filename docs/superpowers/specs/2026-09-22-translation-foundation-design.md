# Translation Foundation Layer — Design Spec

**Date:** 2026-09-22
**Status:** Draft, pending review. §4 superseded by [2026-09-22-translation-manifest-viewer-design.md](./2026-09-22-translation-manifest-viewer-design.md) §1 (monorepo restructuring) — see note below.
**Scope:** Foundation layer only (extraction + translation generation). Confidence scoring, community review, consensus voting, and publish gating are explicitly out of scope — see [Sub-projects](#sub-projects-out-of-scope) below.

## 1. Problem

`bafu-multilanguage` needs to translate BAFU/ecoinvent LCA process data (currently English-only, in ecoSpold v1 XML) into other languages. The design reference (`compass_artifact_wf-a60b85af-88d0-5151-83cb-c242ecbdb8ba_text_markdown.md`) describes a full annual pipeline — LLM translation → confidence scoring → community review with consensus voting → per-row/per-language publish gate — modeled on Wikipedia Content Translation, Mozilla Common Voice, TED Translators, and Weblate/Crowdin.

That pipeline is several independent subsystems, not one project. This spec covers only the first: a system that (a) knows *exactly* which fields need translating, in a durable, inspectable format, and (b) can generate a translation for any `(process, target language)` pair via a pluggable translator. Everything downstream (scoring, review, gating) consumes this layer's output but is designed separately.

## 2. Inputs and key data facts

- Source: `ecoSpold files/*.xml` — 11,947 ecoSpold v1 XML files (one LCA process per file, `process_<uuid>.xml`), ~232MB total. Hackathon work targets the 10-file subset in `sample-10/` (chosen for a spread of record sizes and process types).
- Confirmed by sampling 200 random source files: `name` and `localName` (and the other `local*` attributes) are always identical. There is no pre-existing German translation despite `localLanguageCode="de"` metadata — every translatable field has exactly one English source string, and everything must be translated from scratch.
- Translatable fields per process: `referenceFunction/{name, category, subCategory, generalComment, includedProcesses}`, `geography/text`, `technology/text`, and each `exchange`'s `{name, category, subCategory, generalComment}`. Numeric fields (amounts, uncertainty, dates, UUIDs, the `number` flow-ID) are never translated. **`source/*` (the bibliographic citation) and all `person` names are excluded** — a citation is conventionally kept in its original form regardless of document language, and a person's name isn't something to translate at all.

## 3. Architecture

Two independent pipelines sharing a domain model, built with DDD-style layering (domain → application → infrastructure → interfaces), so the persistence and translation-provider choices are swappable without touching business logic:

```
ecoSpold files/*.xml  (source, untouched)
        │
        ▼
  [Extractor]  ── parses each process file, pulls every translatable
        │          field + its current text, hashes each one
        ▼
translations/process_<uuid>.xml            (manifest: source text + hash, per field)
        │
        │  target language (ISO2) + translator (model name)
        ▼
  [Translator interface]  ── concrete implementation calls an EU-hosted open model
        │
        ▼
translations/process_<uuid>.<lang>.xml     (sidecar: translated text + status +
                                              which source hash it was translated
                                              against + model/timestamp)
```

- **Extraction is language-agnostic.** It never depends on a target language; its output (the manifest) is the single source of truth for "what needs translating," independent of how many languages get generated.
- **Translation is per `(manifest, language, translator)`.** The `Translator` is a domain port; a real implementation calls a Hugging Face Inference Endpoint, but nothing above that port knows or cares.
- **The original ecoSpold files are never modified.** Manifests and sidecars are sidecar artifacts in a new `translations/` directory, not embedded in or merged into the source files. If a fully ecoSpold-valid per-language file is ever needed downstream, that's a cheap later merge step (source + sidecar → `process_<uuid>_<lang>.xml`), not something this layer produces.

### Why sidecar files, not a per-language ecoSpold clone

A full ecoSpold-schema clone per language was considered and rejected: ecoSpold's fixed schema has no room for translation metadata (status, model, source hash), and cloning would duplicate every exchange's numeric data (which never changes by language) across 3-4x as many files, with no gain — nothing downstream needs a directly-loadable ecoSpold file today. The sidecar format is a deliberate YAGNI call: minimal, diffable by hash, and interoperable-if-needed via a future merge step rather than by default.

### Why flat XML files, not a database, for this layer

Persistence needs for this layer are strictly 1:1 lookups by process ID — "give me process X's manifest," "give me process X's German sidecar." Flat files handle that fully, stay human-readable/git-diffable (useful for a hackathon demo), and require no infrastructure. The *next* subsystem (review/voting/scoring) has genuinely query-shaped access patterns (rows needing a second vote, reviewer coverage per language, confidence thresholds) that will likely need a relational store (SQLite is the leading candidate — embedded, zero-ops, and review rows are naturally tabular). That decision is deferred to that subsystem's own design pass. Because persistence is accessed only through repository ports (`ManifestRepository`, `TranslationRepository`), swapping the backing store later means adding one new `infrastructure/` adapter — no change to domain or application code.

## 4. Directory structure (TypeScript, DDD layering)

**Superseded.** This layer was originally designed as a flat `src/` tree. Once a second consumer of the domain layer appeared (the browser viewer in the iteration-1 spec), it was restructured into an npm-workspaces monorepo so `domain/` could be shared without duplication. The content below is unchanged in substance — same files, same responsibilities — just relocated under `packages/domain/` and `packages/pipeline/`. See [2026-09-22-translation-manifest-viewer-design.md](./2026-09-22-translation-manifest-viewer-design.md) §1 for the authoritative current tree.

```
packages/
  domain/                          # @bafu/domain
    src/
      manifest/
        TranslatableField.ts        # value object: fieldPath, sourceText, sourceHash
        TranslationManifest.ts      # aggregate: processId + TranslatableField[]
      translation/
        TranslatedField.ts          # value object: fieldPath, translatedText, sourceHash, status
        Translation.ts              # aggregate: processId, language, TranslatedField[], translator, generatedAt
        TranslationStatus.ts        # value object ("draft" today; extension point for review states)
        LanguageCode.ts             # value object, validates ISO2
      Translator.ts                 # domain port: translate(manifest, language, translatorId) -> Translation

  pipeline/                        # @bafu/pipeline
    src/
      application/
        ports/
          SourceRepository.ts         # port: load a process's raw translatable content from ecoSpold XML
          ManifestRepository.ts       # port: load/save TranslationManifest
          TranslationRepository.ts    # port: load/save Translation (sidecar)
        ExtractManifestUseCase.ts     # SourceRepository -> TranslationManifest -> ManifestRepository
        TranslateProcessUseCase.ts    # ManifestRepository -> Translator -> TranslationRepository
      infrastructure/
        ecospold/
          EcoSpoldXmlParser.ts
          EcoSpoldSourceRepository.ts        # implements SourceRepository
        xml/
          XmlManifestRepository.ts           # implements ManifestRepository
          XmlTranslationRepository.ts        # implements TranslationRepository
        huggingface/
          HuggingFaceTranslator.ts           # implements Translator, calls an HF Inference Endpoint via fetch()
      interfaces/
        cli/
          extract.ts     # wires EcoSpoldSourceRepository + XmlManifestRepository -> ExtractManifestUseCase
          translate.ts   # wires XmlManifestRepository + HuggingFaceTranslator + XmlTranslationRepository -> TranslateProcessUseCase

translations/                    # generated output (manifests + sidecars); not source code, not hand-edited
  process_<uuid>.xml
  process_<uuid>.<lang>.xml
  index.json                      # added by the viewer spec: [{processId, displayName}, …]
```

Domain and application layers contain no I/O and no SDK imports; every external dependency (filesystem, the Hugging Face Inference Endpoint) lives in `infrastructure/` behind a port defined in `domain/` or `application/ports/`. `@bafu/pipeline` depends on `@bafu/domain`; nothing depends on `@bafu/pipeline`.

## 5. Data schema

### Manifest — `translations/process_<uuid>.xml`

One `<field>` per translatable attribute. `hash` is SHA-256 of the trimmed source text. Repeated `exchange` elements are addressed by position (`exchange[i]/...`) since an exchange's own `number` attribute is a global flow ID, not guaranteed unique within a single process's `flowData`; `number` is retained as `exchangeNumber` for human traceability only.

```xml
<translationManifest processId="001835f5-ba6d-361a-8990-7c894d80c087" sourceLanguage="en" extractedAt="2026-09-22T10:00:00Z">
  <field path="referenceFunction/name" text="Natural gas, liquefied, production AE, at freight ship" hash="sha256:ab12…"/>
  <field path="referenceFunction/category" text="…" hash="sha256:…"/>
  <field path="geography/text" text="…" hash="sha256:…"/>
  <field path="exchange[6]/name" exchangeNumber="219622" text="Electricity, low voltage, at grid" hash="sha256:…"/>
  <!-- one <field> per: referenceFunction/{name,category,subCategory,generalComment,includedProcesses},
       geography/text, technology/text,
       and each exchange's {name,category,subCategory,generalComment}.
       source/* and person names are excluded — see §2. -->
</translationManifest>
```

### Sidecar — `translations/process_<uuid>.<lang>.xml`

`path` values mirror the manifest exactly. `sourceHash` records which manifest version this sidecar was translated against — the hook a future diff/re-translation check will use, though that check isn't built in this layer.

```xml
<translation processId="001835f5-ba6d-361a-8990-7c894d80c087" language="de" translator="google/translategemma-4b-it" generatedAt="2026-09-22T10:05:00Z">
  <field path="referenceFunction/name" text="Erdgas, verflüssigt, Produktion AE, am Frachtschiff" sourceHash="sha256:ab12…" status="draft"/>
  …
</translation>
```

`status="draft"` is the only value this layer produces (unreviewed machine output). No confidence score, reviewer, or MQM fields are added now — there is no consumer for them yet; the flat `<field>`-per-attribute shape is the natural place to add them when the review subsystem is designed.

## 6. Translator interface

```ts
// domain/Translator.ts
interface Translator {
  translate(
    manifest: TranslationManifest,
    targetLanguage: LanguageCode,
    translatorId: string,   // e.g. a model name
  ): Promise<Translation>;
}
```

For this layer's demo, `HuggingFaceTranslator` (in `infrastructure/huggingface/`) implements this port against a Hugging Face Inference Endpoint deployed in an EU region, running `google/translategemma-4b-it` — chosen over a hosted-API provider (Claude was evaluated and ruled out entirely, not merely deprioritized; see `2026-09-22-translator-comparison-design.md`, since superseded) for data-residency reasons: BAFU data stays on EU-controlled infrastructure. It calls the endpoint's OpenAI-compatible `/v1/chat/completions` route with plain `fetch()` — no SDK dependency. Unlike a batched-single-request design, TranslateGemma's chat template requires exactly one content entry per request, so `HuggingFaceTranslator` makes **one HTTP request per field**, not one per process. The `translatorId` parameter is passed straight through as the model ID (e.g. `google/translategemma-4b-it`).

## 7. Error handling

- **Extraction:** a missing or unparseable expected element is skipped with a warning; extraction continues for the rest of the process. An unparseable source file is skipped with a logged error; the batch continues (matters once this runs against the full 11,947-file corpus, not just `sample-10/`).
- **Translation:** a `Translation` aggregate is written only once every field for that `(process, language)` has succeeded — no partial/corrupt sidecars. A failure for one process is logged and does not abort the batch for other processes. `HuggingFaceTranslator` has no built-in retry (no SDK sits underneath it) — a transient failure on one field fails that process's whole translation for this run; re-running `translate` is the recovery path.
- **Idempotency:** both scripts are safe to re-run. `extract` overwrites the manifest; `translate` overwrites that language's sidecar. No versioning is needed at this layer — the manifest and sidecar are derived/generated artifacts, never hand-edited.

## 8. Testing

- `domain/`: pure unit tests, no I/O (hashing determinism, value-object validation).
- `infrastructure/ecospold/EcoSpoldXmlParser`: tested against the real fixtures in `sample-10/` (already curated for size/type variety).
- `infrastructure/xml/*Repository`: round-trip tests (write, read back, assert equality).
- `application/*UseCase`: tested with in-memory fake repositories and a fake `Translator` — no real API calls in the automated suite.
- `HuggingFaceTranslator`: exercised via a manual/opt-in script against `sample-10/`, not part of the default automated test run (avoids spending inference cost in CI).

## 9. Sub-projects (out of scope)

Each gets its own brainstorming → spec → plan cycle, building on this layer's manifest/sidecar output:

- **Confidence scoring** — QE model (COMETKiwi/xCOMET, or Google MetricX-25 — built on Gemma 3 12B, predicts MQM-style error scores; see `2026-09-22-translator-comparison-design.md` for sourcing) + deterministic rule checks (placeholders, numbers/dates, glossary, locale) + optional LLM-as-judge for borderline rows.
- **Community review** — contributor/reviewer/coordinator roles, 2-vote consensus, gold items, MQM-structured flags; needs a queryable persistence layer (see §3).
- **Publish gating** — per-row and per-language gates, English fallback labeling, provenance storage.
- **Annual re-run / diffing** — using the manifest's per-field `hash` to detect changed source text and re-translate only the delta; carrying forward prior approvals. The hash is already produced by this layer specifically so that hook exists later.

## 10. Open questions for implementation planning

- Whether the largest processes (e.g. the 446-line sample) risk exceeding a single response's practical output size and need splitting across multiple requests, and whether several small processes could be batched into one request for efficiency — a refinement of the per-process-single-request default in §6.
- CLI argument shape for `translate` (single process vs. whole `sample-10/` batch, language list, model override).
