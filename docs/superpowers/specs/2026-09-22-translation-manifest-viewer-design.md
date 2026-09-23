# Iteration 1: Translation Manifest Viewer — Design Spec

**Date:** 2026-09-22
**Status:** Draft, pending review
**Depends on:** [2026-09-22-translation-foundation-design.md](./2026-09-22-translation-foundation-design.md) (manifest/sidecar schema, `Translator` port, `@bafu/domain` types — unchanged in substance; only its directory location moves, per §1 below)
**Scope:** A backoffice maintainer can run the foundation-layer pipeline against `sample-10/` for one language (Russian) and browse the results — English source next to translation, per field, per dataset — in a real browser app. No review workflow, no voting, no confidence scoring, no auth: read-only observation only.

## 1. Monorepo restructuring

The foundation-layer spec defined a flat `src/` tree. This iteration adds a second consumer of `@bafu/domain` (a browser app, alongside the existing CLI), so the repo becomes an npm-workspaces monorepo. This supersedes that spec's §4; nothing about the domain types, ports, or use cases changes — only their location.

```
package.json                     # workspace root: "workspaces": ["packages/*"]
packages/
  domain/                        # @bafu/domain — pure types, zero I/O, zero Node APIs (unchanged from foundation spec)
    src/manifest/  src/translation/  src/Translator.ts

  pipeline/                      # @bafu/pipeline — CLI (unchanged from foundation spec, relocated)
    src/application/  src/infrastructure/  src/interfaces/cli/

  viewer/                        # @bafu/viewer — new: React + Vite app
    src/
      application/
        ports/
          ManifestQueryRepository.ts
        ListDatasetsUseCase.ts
        ViewDatasetUseCase.ts
      infrastructure/
        fetch/
          FetchManifestRepository.ts
      ui/
        App.tsx
        DatasetList.tsx
        DatasetDetail.tsx
        FieldRow.tsx
      main.tsx
    index.html
    vite.config.ts

translations/                    # generated output, served statically to the viewer in dev/prod
  process_<uuid>.xml
  process_<uuid>.ru.xml
  index.json                     # added by this iteration — see §3

ecoSpold files/   sample-10/     # source data (unchanged)
docs/                            # specs (unchanged)
.github/workflows/               # CI + Pages deploy — see §5
```

`@bafu/pipeline` and `@bafu/viewer` both depend on `@bafu/domain`; neither depends on the other. This is the DDD payoff: one definition of `TranslationManifest`/`Translation`, two independent interface layers (CLI, browser) consuming it through their own infrastructure adapters.

## 2. Demo scope

- Dataset: `sample-10/` (all 10 processes).
- Language: Russian (`ru`) only, via `@bafu/pipeline`'s `translate` CLI backed by `HuggingFaceTranslator` (`google/translategemma-12b-it`, served via a Hugging Face Inference Endpoint in the EU).
- "Iteration 1" includes actually running `extract` then `translate --lang ru` against `sample-10/` to produce real `translations/*.xml`, not just building the viewer against fixtures.

## 3. Viewer internals

**Read-only port** (viewer-specific — not in `@bafu/domain`, since the CLI has no use for it):

```ts
interface ManifestQueryRepository {
  listDatasets(): Promise<{ processId: string; displayName: string }[]>;
  loadManifest(processId: string): Promise<TranslationManifest>;
  loadTranslation(processId: string, language: LanguageCode): Promise<Translation | null>; // null = not yet translated
}
```

`FetchManifestRepository` implements it via `fetch()` + `DOMParser` against the statically-served `translations/` directory, parsing into the *same* `TranslationManifest`/`Translation` types `@bafu/pipeline` produces — no separate viewer-side schema, no drift risk.

**Dataset discovery without an API.** Browsers can't list a directory, and hardcoding 10 UUIDs doesn't generalize. `@bafu/pipeline`'s `extract` CLI writes one additional file after a batch run: `translations/index.json` — `[{processId, displayName}, …]`, where `displayName` is that process's `referenceFunction/name` field value (the human-readable process name already in the manifest — e.g. "Natural gas, liquefied, production AE, at freight ship" — not the UUID). Still a static file; this is what `listDatasets()` reads, and it's what lets the dataset count grow later without touching the viewer.

**UI shape** (deliberately minimal — internal maintainer tool, single hardcoded language for this iteration, no language switcher):
- Dataset list: 10 rows (`displayName` + `processId`), reading `index.json`.
- Dataset detail (on click): every manifest field, grouped by section (`referenceFunction`, `geography`, `technology`, each `exchange`), each row showing the English source text next to the Russian translation (`loadTranslation(processId, 'ru')`, hardcoded — see §6) — or a "not translated" badge if that field has no sidecar entry (an expected state, not an error).

**Data flow:**
```
extract  ──▶ translations/process_<uuid>.xml  +  translations/index.json
translate --lang ru ──▶ translations/process_<uuid>.ru.xml
                              │
                    (Vite dev server / static build serves translations/)
                              │
                    viewer: fetch index.json → fetch manifest + ru sidecar per dataset
```

## 4. Error handling & testing

- **Error handling:** missing `ru` sidecar for a field/dataset renders as "not translated," never as an error state. A malformed manifest/sidecar file (shouldn't happen since these are always machine-generated, but the parser should not crash the whole app on one bad file) surfaces as an inline error for that one dataset row, not a blank screen.
- **Testing:** `FetchManifestRepository` and both use cases get unit tests against fixture XML served via a mocked `fetch`. `DatasetList`/`DatasetDetail` get component tests with fake repository data. Nothing in the viewer's automated tests touches a live Hugging Face Inference Endpoint call — that boundary is already owned by `@bafu/pipeline`'s own tests (foundation spec §8).

## 5. CI & Deployment

- **CI (GitHub Actions, on push/PR):** install workspace deps, `tsc --noEmit` across all three packages, lint, run the unit test suites for `@bafu/domain`, `@bafu/pipeline`, and `@bafu/viewer`. No live Hugging Face Inference Endpoint calls in CI.
- **Deployment (GitHub Pages):** `@bafu/viewer` is built with `vite build`; a GitHub Actions workflow deploys the build output to GitHub Pages on push to `main` (`actions/deploy-pages`). `translations/` (the generated manifest + `ru` sidecars for `sample-10`, plus `index.json`) is **committed to the repo** as static data and copied into the build output — not regenerated in CI, since that would need an `HF_TOKEN` as a CI secret firing on every push (and the Inference Endpoint may not even be running continuously — HF Inference Endpoints can scale to zero between uses). Refreshing translations is a manual local step (`npm run translate -- --lang ru`), with the updated output committed like any other change.
- **Prerequisite:** this directory has no git repo or GitHub remote yet. `git init` + creating/connecting the GitHub repo is step zero of implementation, not something done during design.

## 6. Explicitly out of scope for this iteration

- Any write action (approve/edit/reject a translation) — this is observation-only.
- Confidence scoring, review consensus, publish gating — per the foundation spec's §9, each is its own future sub-project.
- Any language other than Russian.
- Auth/access control on the deployed viewer. GitHub Pages is public by default. Recommendation: proceed without auth — this is published LCA/environmental process data (ecoinvent-derived), person names and bibliographic citations are already excluded from translation (§2 of the foundation spec) and the source `person` records are already anonymised (address/email/phone redacted) in the ecoSpold files themselves — but this is a confirm-before-shipping item, not something to decide by default if the answer turns out to be "this data isn't meant to be public."
