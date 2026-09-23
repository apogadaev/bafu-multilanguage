# Translator Comparison: Claude vs. TranslateGemma-12B-it — Design Spec

**Date:** 2026-09-22
**Status:** Superseded (2026-09-23) — after this spec was written, the decision was made to rule Claude out as a translation-provider candidate entirely (data residency/sovereignty, avoiding vendor lock-in), rather than compare it against an open model. There is no comparison to run: `HuggingFaceTranslator` (`google/translategemma-12b-it` via a Hugging Face Inference Endpoint, EU region) is now simply the pipeline's translator — see the foundation spec §6 and the pipeline plan's Task 10 for the built design, which reuses this spec's model choice (§3), hosting decision (§4), and verified HF API contract research, but drops the comparison mechanism (§5-§6) entirely. Kept for its research record (model/hosting evaluation) rather than deleted.
**Depends on:** [2026-09-22-translation-foundation-design.md](./2026-09-22-translation-foundation-design.md) (`Translator` port, `TranslationManifest`, `ManifestRepository`, `@bafu/pipeline` package)
**Source:** `Open Translation Models Shortlist.md` (repo root) — a research survey of open/self-hostable translation models and QE models, evaluated against this project's needs.
**Scope:** Add a second `Translator` implementation targeting an open, self-hostable model, and a one-off comparison tool to evaluate it against `ClaudeTranslator` on real `sample-10` data. This is evaluation tooling, not a change to the pipeline's persistent data model or the regular `translate` CLI.

## 1. Motivation

The foundation-layer spec's `Translator` port was already designed to be provider-agnostic (`translate(manifest, targetLanguage, translatorId): Promise<Translation>`), with `ClaudeTranslator` as its first concrete implementation. Three concerns argue for actually exercising that abstraction now, before committing further:

- **Data residency / sovereignty.** This is Swiss federal (BAFU) data. Running translation inference on infrastructure under EU/Swiss control, rather than exclusively through a US-hosted API, is worth evaluating independent of quality.
- **Avoiding vendor lock-in.** A pipeline that only ever proves it can call one provider hasn't really validated the port abstraction it's built on.
- **A real quality comparison.** Not a preference against Claude specifically — a decision about which translator to use long-term should be based on how each performs on actual BAFU/ecoinvent process data, not on benchmark leaderboards for news and literary text (which the source research explicitly warns don't transfer to short structured fields like ours).

Cost at scale was explicitly **not** a driver for this — this is about sovereignty, lock-in, and measured quality, not per-token pricing.

## 2. What this is not

- **Not a replacement for `ClaudeTranslator`.** Task 10 of the foundation pipeline plan builds `ClaudeTranslator` exactly as originally speced — it's needed as one half of this comparison regardless of the outcome.
- **Not a change to the persistent schema.** `translations/process_<uuid>.<lang>.xml` stays one sidecar per `(process, language)`. A second translator's output for the same pair is never written there — see §5 for why.
- **Not a change to the regular `translate` CLI.** It keeps defaulting to `claude-opus-5` per the foundation spec's Global Constraints, until and unless a decision is made to change that default based on this comparison's outcome — a separate, later decision, not part of this spec.

## 3. Model choice

Of the shortlist's candidates (TranslateGemma-4B/12B/27B, Tencent Hunyuan-MT-7B/Hy-MT2, Qwen 3.6, Meta NLLB-200), **TranslateGemma-12B-it** is the comparison target:

- Dedicated translation model, not a general LLM prompted for translation — a fairer comparison of translation-specific capability.
- Per the source research, the 12B variant beats Gemma 3 27B on WMT24++ while being small enough to run on far more modest hardware than the 27B variant.
- Standard Gemma license (accept on Hugging Face) — no jurisdiction-exclusion issue like the one flagged for Hunyuan-MT/Hy-MT2 (excluded from EU use in earlier license versions).
- One fixed chat template to implement, rather than needing to support multiple models' differing prompt formats in this pass.

Qwen 3.6 (Apache 2.0, better instruction-following, not translation-specialized) was considered and set aside for this round — YAGNI: one working comparison point is enough to inform the decision this spec exists to support; a second model adapter can follow later if the first comparison doesn't settle the question.

## 4. Hosting

**Hugging Face Inference Endpoints, deployed in an EU region.** This avoids standing up and operating GPU infrastructure directly (TranslateGemma-12B needs real GPU capacity — a laptop per the source research, but still infrastructure this project doesn't currently have or need to own), while still addressing the sovereignty motivation: HF Inference Endpoints support deploying to a specific region, including the EU, unlike a plain hosted API call to a US-based provider.

**Honest gap:** the exact request/response shape HF Inference Endpoints expects for a chat-template model like TranslateGemma-12B-it is not something this spec asserts from memory. When this moves to an implementation plan, the actual HF API documentation gets read first — same discipline already applied to the Claude integration — rather than guessing a plausible-looking request format now. Section 8 tracks this as an explicit open item.

## 5. Why a separate comparison tool, not a schema change

A real side-by-side comparison means translating the same `(process, "ru")` pair with two different translators. The existing sidecar schema — one file per `(process, language)`, translator recorded as metadata *inside* that file — can't hold two translators' output for the same pair at once; a second run would simply overwrite the first.

Two ways to fix that were considered:

- **Extend the sidecar filename to include translator identity** (`process_<uuid>.<lang>.<translator>.xml`), letting multiple translators coexist permanently. Rejected: this reopens the foundation pipeline's already-built, already-reviewed Tasks 7 (`XmlManifestRepository`) and 9 (`XmlTranslationRepository`) file-naming convention, plus the viewer plan's `FetchManifestRepository`/`index.json` design, for a decision (which translator to use going forward) that's meant to be made once, not carried as permanent multi-translator infrastructure.
- **Run the comparison as a separate, standalone tool that never touches `translations/`.** Chosen. Gets the actual comparison without touching anything already built.

## 6. Architecture

```
sample-10/*.xml (already extracted into translations/*.xml manifests by the foundation pipeline)
        │
        ▼
  [compare CLI]  ── for each manifest: call ClaudeTranslator.translate(...)
        │            AND HuggingFaceTranslator.translate(...), both for "ru"
        ▼
comparisons/ru-claude-vs-translategemma.md   (human-readable report, one section
                                                per dataset, one row per field:
                                                path | English | Claude | TranslateGemma)
```

- `HuggingFaceTranslator` (new, `packages/pipeline/src/infrastructure/huggingface/HuggingFaceTranslator.ts`) implements the exact same `Translator` port `ClaudeTranslator` does — nothing in `@bafu/domain` or the application layer changes.
- `compare.ts` (new, `packages/pipeline/src/interfaces/cli/compare.ts`) is a standalone script: loads manifests via the existing `ManifestRepository`/`XmlManifestRepository`, calls both translators directly, writes the Markdown report. It does **not** go through `TranslateProcessUseCase` or `TranslationRepository` — those are the "publish one translator's output" path, and this tool is explicitly not that.
- `comparisons/` is a new top-level output directory, separate from `translations/`, gitignored or committed at the user's discretion (it's a one-time evaluation artifact, not pipeline output).

## 7. Secrets and error handling

- `HF_TOKEN` via environment variable, mirroring how `ANTHROPIC_API_KEY` is already handled — never hardcoded, never logged.
- This is a manual, one-off dev tool, not part of CI or the regular pipeline: if the HF endpoint is unreachable or misconfigured, the script fails loudly (lets the error propagate) rather than needing graceful degradation.
- No automated test makes a real call to either the Claude or the HF endpoint — `HuggingFaceTranslator`'s own unit tests mock its HTTP call the same way `ClaudeTranslator`'s tests mock `Anthropic.messages.parse`, per the foundation spec's existing testing discipline.

## 8. Open questions for implementation planning

- **The exact HF Inference Endpoints request/response contract for TranslateGemma-12B-it** — needs live documentation research before any code is written for `HuggingFaceTranslator`; nothing in this spec should be read as asserting that shape.
- Whether `comparisons/` output is committed to the repo or left as a local-only artifact.
- What happens after the comparison: this spec doesn't decide whether the `translate` CLI's default translator changes as a result — that's a follow-up decision informed by the comparison's outcome, not something to pre-decide here.
