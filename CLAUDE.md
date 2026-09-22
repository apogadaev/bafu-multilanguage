# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state of this repository

This is **not yet a codebase** — there is no source code, build tooling, package manifest, or git repository here. It currently contains only:

- `ecoSpold files/` — the full corpus: 11,947 ecoSpold v1 XML files (~232 MB total), one LCA (life cycle assessment) process dataset per file.
- `sample-10/` — a 10-file working subset of `ecoSpold files/`, hand-picked for a spread of record sizes (41–446 lines) and process types (gas, heat, water, transport, waste disposal). **For hackathon scope, build and test the pipeline against `sample-10/` first**, not the full corpus.
- `compass_artifact_wf-a60b85af-88d0-5151-83cb-c242ecbdb8ba_text_markdown.md` — a research report that is the design reference for the translation pipeline this project intends to build.

Since there is no code yet, there are no build/lint/test commands to document. When code is added, this file should be updated with the actual commands.

## Project intent

This is a hackathon project (`bafu-multilanguage`, hackathon2026) about translating BAFU/ecoinvent LCA process data (currently English, with German as the "local" language for most records) into multiple languages. The design reference (`compass_artifact_...md`) lays out the intended pipeline:

1. **LLM translation** of the human-readable fields per record (see below), with a versioned prompt, glossary, and do-not-translate/placeholder rules.
2. **Multi-signal confidence scoring** to route rows: reference-free QE models (COMETKiwi / xCOMET) + deterministic rule checks (placeholders, numbers/dates, glossary terms, locale format) + optional LLM-as-judge for borderline rows. QE alone must never auto-publish — it is a known blind spot for fluent hallucinations and numeric/format errors.
3. **Community review with consensus gating**, modeled on Wikipedia Content Translation, Mozilla Common Voice, TED Translators, and Weblate/Crowdin: contributor → reviewer → language-coordinator roles, ≥2 independent approvals per row, gold/control items to measure reviewer accuracy, MQM-style structured flags (category + severity) instead of free text.
4. **Per-row and per-language publish gates**: a row publishes only once it clears the confidence/consensus bar and has no unresolved critical flag; a language "opens" only once a random MQM/ISO 5060 sample passes and reviewer coverage is met. Everything else falls back to English with a "machine translated / pending review" label.
5. **Annual re-run via diffing**: key each record by stable ID + source-text hash so only new/changed source is re-translated and re-reviewed; approved prior translations carry forward.
6. Full provenance must be stored per translated field: source ID/hash, target language (BCP 47), model + prompt version, QE score, rule-check results, reviewer IDs, votes, MQM flags, status, timestamps.

Read the full markdown report for calibration thresholds, licensing (CC0/CC BY-SA), and GDPR considerations (reviewer identities are personal data) before implementing the pipeline.

## Data format: ecoSpold files

Each file under `ecoSpold files/` is named `process_<uuid>.xml`, where `<uuid>` matches the UUID embedded in that record's `referenceFunction/@generalComment` text. This is the **ecoSpold v1** schema (as emitted by openLCA), not ecoSpold v2 — do not assume v2 element names when writing a parser.

Structure of a single `<ecoSpold><dataset>`:

- `metaInformation/processInformation`
  - `referenceFunction` — the core process description: `name`/`localName` (English/German), `category`/`localCategory`, `subCategory`/`localSubCategory`, `generalComment` (free text, contains the record's UUID), `includedProcesses`, `unit`, `amount`.
  - `geography` — `location` code (e.g. `CH`, `RER`) + free-text `text`.
  - `technology` — free-text `text`.
  - `timePeriod` — `startDate`/`endDate`.
  - `dataSetInformation` — `languageCode` (primary language of `name`, always `en` in this dataset) and `localLanguageCode` (mostly `de`, sometimes `en`), plus `version`/`timestamp`.
- `metaInformation/modellingAndValidation` — `representativeness`, `source` (bibliographic reference text), `validation`.
- `metaInformation/administrativeInformation` — `dataEntryBy`, `dataGeneratorAndPublication`, `person` records (contain `name`; `address`/`email`/`telephone` are already anonymised in this export).
- `flowData/exchange` (repeated) — one row per input/output flow of the process: `name`/`category`/`subCategory` and their `local*` counterparts, `meanValue`, `unit`, `location`, `uncertaintyType`/`standardDeviation95`, and either an `<inputGroup>` or `<outputGroup>` child indicating flow direction. `generalComment` here often carries an ecoinvent pedigree-matrix code (e.g. `(1,3,2,1,1,5)`).

**Translatable (localizable) fields** are the free-text/name attributes: `referenceFunction` `name`/`localName`/`category`/`localCategory`/`subCategory`/`localSubCategory`/`generalComment`/`includedProcesses`; `geography`/`technology` `text`; `source` `text` and author/publisher fields; and each `exchange`'s `name`/`category`/`subCategory`/`generalComment`. Numeric fields (`meanValue`, `standardDeviation95`, dates, UUIDs, `number` foreign keys used to cross-reference exchanges between processes) must be left untouched by any translation step.
