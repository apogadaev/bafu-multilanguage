# Translation Manifest Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@bafu/viewer` — a React/Vite browser app, served statically, that lets a maintainer browse `sample-10/`'s 10 datasets and see each translatable field's English source next to its Russian translation — plus CI and a GitHub Pages deployment.

**Architecture:** Same DDD layering as `@bafu/pipeline` (application ports/use-cases, infrastructure adapters, UI), sharing `@bafu/domain`'s types. `FetchManifestRepository` reads the same manifest/sidecar XML files the pipeline produces, via `fetch()` + `DOMParser` against statically-served files — no backend, no API server.

**Tech Stack:** React 18, Vite 6, TypeScript, Vitest + `@testing-library/react` (jsdom), GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-22-translation-manifest-viewer-design.md`

**Prerequisite:** `docs/superpowers/plans/2026-09-22-translation-pipeline.md` must be fully executed first, including its Task 13 (`translations/` populated with real manifests + Russian sidecars for all 10 `sample-10/` datasets, committed). Task 6 and Task 9 below both need that real data to verify against.

## Global Constraints

- The viewer is read-only: no write/approve/edit action anywhere in the UI.
- Hardcode the target language to Russian (`ru`) — no language switcher, per spec §3.
- No backend, no database, no API endpoint — every data access is a `fetch()` against a statically-served file.
- **Tasks 8 and 9 create a public GitHub repository and enable public GitHub Pages hosting.** Per the spec's §6 recommendation (published LCA data, no PII, no auth needed) this was already discussed with the user, but confirm the exact repository name and that they're still fine with public hosting before running any command in those two tasks — do not treat this plan's approval as blanket authorization to push code or make a repo public without that final check.

---

## File Structure

```
packages/viewer/
  package.json  tsconfig.json  vite.config.ts  vitest.config.ts  vitest.setup.ts  index.html
  src/
    vite-env.d.ts
    application/
      ports/ManifestQueryRepository.ts
      ListDatasetsUseCase.ts        (+ .test.ts)
      ViewDatasetUseCase.ts         (+ .test.ts)
    infrastructure/fetch/
      FetchManifestRepository.ts    (+ .test.ts)
    ui/
      App.tsx
      DatasetList.tsx               (+ .test.tsx)
      DatasetDetail.tsx             (+ .test.tsx)
      FieldRow.tsx
    main.tsx

.github/workflows/
  ci.yml
  deploy.yml
```

---

### Task 1: Viewer package scaffold + `ManifestQueryRepository` port + `ListDatasetsUseCase`

**Files:**
- Create: `packages/viewer/package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `vitest.setup.ts`, `index.html`, `src/vite-env.d.ts`
- Create: `packages/viewer/src/application/ports/ManifestQueryRepository.ts`
- Create: `packages/viewer/src/application/ListDatasetsUseCase.ts` (+ `.test.ts`)

**Interfaces:**
- Consumes: `LanguageCode`, `Translation`, `TranslationManifest` from `@bafu/domain`
- Produces: `DatasetSummary { processId: string; displayName: string }`; `ManifestQueryRepository { listDatasets(): Promise<DatasetSummary[]>; loadManifest(processId): Promise<TranslationManifest>; loadTranslation(processId, language): Promise<Translation | null> }`; `ListDatasetsUseCase.execute(): Promise<DatasetSummary[]>`

- [ ] **Step 1: Scaffold the package**

Create `packages/viewer/package.json`:

```json
{
  "name": "@bafu/viewer",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@bafu/domain": "*",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.6.0",
    "jsdom": "^25.0.0",
    "vite": "^6.0.0",
    "vitest": "^3.0.0",
    "typescript": "^5.7.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0"
  }
}
```

Create `packages/viewer/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "rootDir": "./src",
    "paths": { "@bafu/domain": ["../domain/src/index.ts"] }
  },
  "include": ["src"]
}
```

Create `packages/viewer/vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  // Relative base: the built app works whether served from a domain root
  // or a GitHub Pages project subpath, without hardcoding the repo name.
  base: "./",
  plugins: [react()],
  resolve: {
    alias: { "@bafu/domain": fileURLToPath(new URL("../domain/src/index.ts", import.meta.url)) },
  },
  // Serves translations/*.xml + index.json at the site root in both dev and build.
  publicDir: fileURLToPath(new URL("../../translations", import.meta.url)),
});
```

Create `packages/viewer/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: { "@bafu/domain": fileURLToPath(new URL("../domain/src/index.ts", import.meta.url)) },
  },
});
```

Create `packages/viewer/vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

Create `packages/viewer/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Translation Manifest Viewer</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `packages/viewer/src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
```

Run: `npm install`
Expected: installs successfully, links `@bafu/domain` into `packages/viewer/node_modules`.

- [ ] **Step 2: Define the `ManifestQueryRepository` port**

Create `packages/viewer/src/application/ports/ManifestQueryRepository.ts`:

```ts
import type { LanguageCode, Translation, TranslationManifest } from "@bafu/domain";

export interface DatasetSummary {
  processId: string;
  displayName: string;
}

export interface ManifestQueryRepository {
  listDatasets(): Promise<DatasetSummary[]>;
  loadManifest(processId: string): Promise<TranslationManifest>;
  loadTranslation(processId: string, language: LanguageCode): Promise<Translation | null>;
}
```

- [ ] **Step 3: Write the failing test for `ListDatasetsUseCase`**

Create `packages/viewer/src/application/ListDatasetsUseCase.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { ListDatasetsUseCase } from "./ListDatasetsUseCase";
import type { ManifestQueryRepository, DatasetSummary } from "./ports/ManifestQueryRepository";

class FakeRepository implements ManifestQueryRepository {
  constructor(private readonly datasets: DatasetSummary[]) {}
  async listDatasets(): Promise<DatasetSummary[]> {
    return this.datasets;
  }
  async loadManifest(): Promise<never> {
    throw new Error("not used in this test");
  }
  async loadTranslation(): Promise<null> {
    return null;
  }
}

describe("ListDatasetsUseCase", () => {
  it("returns the datasets from the repository", async () => {
    const datasets = [{ processId: "abc", displayName: "Natural gas" }];
    const useCase = new ListDatasetsUseCase(new FakeRepository(datasets));
    expect(await useCase.execute()).toEqual(datasets);
  });
});
```

- [ ] **Step 4: Run to verify it fails**

Run: `npm test --workspace=@bafu/viewer` — Expected: FAIL (module not found)

- [ ] **Step 5: Implement `ListDatasetsUseCase`**

Create `packages/viewer/src/application/ListDatasetsUseCase.ts`:

```ts
import type { ManifestQueryRepository, DatasetSummary } from "./ports/ManifestQueryRepository";

export class ListDatasetsUseCase {
  constructor(private readonly repository: ManifestQueryRepository) {}

  async execute(): Promise<DatasetSummary[]> {
    return this.repository.listDatasets();
  }
}
```

- [ ] **Step 6: Run to verify it passes**

Run: `npm test --workspace=@bafu/viewer` — Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold viewer package and add ManifestQueryRepository/ListDatasetsUseCase"
```

---

### Task 2: `ViewDatasetUseCase`

**Files:**
- Create: `packages/viewer/src/application/ViewDatasetUseCase.ts` (+ `.test.ts`)

**Interfaces:**
- Consumes: `ManifestQueryRepository` (Task 1), `LanguageCode` from `@bafu/domain`
- Produces: `DatasetFieldView { path, sourceText, translatedText: string | null, status: string | null }`; `DatasetView { processId, fields: DatasetFieldView[] }`; `ViewDatasetUseCase.execute(processId, language): Promise<DatasetView>` — this is what Task 5's `DatasetDetail` and `FieldRow` consume

- [ ] **Step 1: Write the failing tests**

Create `packages/viewer/src/application/ViewDatasetUseCase.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { LanguageCode, TranslatableField, TranslatedField, Translation, TranslationManifest } from "@bafu/domain";
import { ViewDatasetUseCase } from "./ViewDatasetUseCase";
import type { ManifestQueryRepository, DatasetSummary } from "./ports/ManifestQueryRepository";

const validHash = `sha256:${"a".repeat(64)}`;

class FakeRepository implements ManifestQueryRepository {
  constructor(
    private readonly manifest: TranslationManifest,
    private readonly translation: Translation | null,
  ) {}
  async listDatasets(): Promise<DatasetSummary[]> {
    return [];
  }
  async loadManifest(): Promise<TranslationManifest> {
    return this.manifest;
  }
  async loadTranslation(): Promise<Translation | null> {
    return this.translation;
  }
}

describe("ViewDatasetUseCase", () => {
  it("pairs each source field with its translation when one exists", async () => {
    const manifest = TranslationManifest.create({
      processId: "abc",
      sourceLanguage: "en",
      extractedAt: new Date(),
      fields: [
        TranslatableField.create({ path: "referenceFunction/name", text: "Natural gas", hash: validHash }),
        TranslatableField.create({ path: "geography/text", text: "not known", hash: validHash }),
      ],
    });
    const translation = Translation.create({
      processId: "abc",
      language: LanguageCode.create("ru"),
      translator: "google/translategemma-12b-it",
      generatedAt: new Date(),
      fields: [
        TranslatedField.create({ path: "referenceFunction/name", text: "Природный газ", sourceHash: validHash, status: "draft" }),
      ],
    });

    const useCase = new ViewDatasetUseCase(new FakeRepository(manifest, translation));
    const view = await useCase.execute("abc", LanguageCode.create("ru"));

    expect(view.fields).toEqual([
      { path: "referenceFunction/name", sourceText: "Natural gas", translatedText: "Природный газ", status: "draft" },
      { path: "geography/text", sourceText: "not known", translatedText: null, status: null },
    ]);
  });

  it("marks every field as untranslated when no translation exists yet", async () => {
    const manifest = TranslationManifest.create({
      processId: "abc",
      sourceLanguage: "en",
      extractedAt: new Date(),
      fields: [TranslatableField.create({ path: "referenceFunction/name", text: "Natural gas", hash: validHash })],
    });

    const useCase = new ViewDatasetUseCase(new FakeRepository(manifest, null));
    const view = await useCase.execute("abc", LanguageCode.create("ru"));

    expect(view.fields).toEqual([{ path: "referenceFunction/name", sourceText: "Natural gas", translatedText: null, status: null }]);
  });
});
```

- [ ] **Step 2: Run to verify it fails, then implement**

Run: `npm test --workspace=@bafu/viewer` — Expected: FAIL (module not found)

Create `packages/viewer/src/application/ViewDatasetUseCase.ts`:

```ts
import type { LanguageCode } from "@bafu/domain";
import type { ManifestQueryRepository } from "./ports/ManifestQueryRepository";

export interface DatasetFieldView {
  path: string;
  sourceText: string;
  translatedText: string | null;
  status: string | null;
}

export interface DatasetView {
  processId: string;
  fields: DatasetFieldView[];
}

export class ViewDatasetUseCase {
  constructor(private readonly repository: ManifestQueryRepository) {}

  async execute(processId: string, language: LanguageCode): Promise<DatasetView> {
    const manifest = await this.repository.loadManifest(processId);
    const translation = await this.repository.loadTranslation(processId, language);
    const translatedByPath = new Map((translation?.fields ?? []).map((f) => [f.path, f]));

    const fields: DatasetFieldView[] = manifest.fields.map((field) => {
      const translated = translatedByPath.get(field.path);
      return {
        path: field.path,
        sourceText: field.text,
        translatedText: translated?.text ?? null,
        status: translated?.status ?? null,
      };
    });

    return { processId: manifest.processId, fields };
  }
}
```

- [ ] **Step 3: Run to verify it passes**

Run: `npm test --workspace=@bafu/viewer` — Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(viewer): add ViewDatasetUseCase"
```

---

### Task 3: `FetchManifestRepository`

**Files:**
- Create: `packages/viewer/src/infrastructure/fetch/FetchManifestRepository.ts` (+ `.test.ts`)

**Interfaces:**
- Consumes: `ManifestQueryRepository` port (Task 1)
- Produces: `FetchManifestRepository` implementing `ManifestQueryRepository`, constructed with `(baseUrl?: string)` defaulting to `import.meta.env.BASE_URL`

- [ ] **Step 1: Write the failing tests, stubbing global `fetch`**

Create `packages/viewer/src/infrastructure/fetch/FetchManifestRepository.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { LanguageCode } from "@bafu/domain";
import { FetchManifestRepository } from "./FetchManifestRepository";

const MANIFEST_XML = `<?xml version="1.0"?>
<translationManifest processId="abc" sourceLanguage="en" extractedAt="2026-09-22T10:00:00.000Z">
  <field path="referenceFunction/name" text="Natural gas" hash="sha256:${"a".repeat(64)}"/>
</translationManifest>`;

const TRANSLATION_XML = `<?xml version="1.0"?>
<translation processId="abc" language="ru" translator="google/translategemma-12b-it" generatedAt="2026-09-22T10:05:00.000Z">
  <field path="referenceFunction/name" text="Природный газ" sourceHash="sha256:${"a".repeat(64)}" status="draft"/>
</translation>`;

function fakeFetch(responses: Record<string, { status: number; body: string }>) {
  return vi.fn(async (url: string | URL) => {
    const path = url.toString();
    const match = Object.entries(responses).find(([key]) => path.endsWith(key));
    if (!match) {
      throw new Error(`no fake response registered for ${path}`);
    }
    const [, { status, body }] = match;
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => body,
      json: async () => JSON.parse(body),
    } as Response;
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FetchManifestRepository", () => {
  it("lists datasets from index.json", async () => {
    vi.stubGlobal(
      "fetch",
      fakeFetch({ "index.json": { status: 200, body: JSON.stringify([{ processId: "abc", displayName: "Natural gas" }]) } }),
    );
    const repo = new FetchManifestRepository("/");
    expect(await repo.listDatasets()).toEqual([{ processId: "abc", displayName: "Natural gas" }]);
  });

  it("loads and parses a manifest", async () => {
    vi.stubGlobal("fetch", fakeFetch({ "process_abc.xml": { status: 200, body: MANIFEST_XML } }));
    const repo = new FetchManifestRepository("/");
    const manifest = await repo.loadManifest("abc");
    expect(manifest.processId).toBe("abc");
    expect(manifest.fields[0].text).toBe("Natural gas");
  });

  it("loads and parses a translation", async () => {
    vi.stubGlobal("fetch", fakeFetch({ "process_abc.ru.xml": { status: 200, body: TRANSLATION_XML } }));
    const repo = new FetchManifestRepository("/");
    const translation = await repo.loadTranslation("abc", LanguageCode.create("ru"));
    expect(translation?.translator).toBe("google/translategemma-12b-it");
    expect(translation?.fields[0].text).toBe("Природный газ");
    expect(translation?.fields[0].status).toBe("draft");
  });

  it("returns null when the translation sidecar doesn't exist (404)", async () => {
    vi.stubGlobal("fetch", fakeFetch({ "process_abc.fr.xml": { status: 404, body: "" } }));
    const repo = new FetchManifestRepository("/");
    const translation = await repo.loadTranslation("abc", LanguageCode.create("fr"));
    expect(translation).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails, then implement**

Run: `npm test --workspace=@bafu/viewer` — Expected: FAIL (module not found)

Create `packages/viewer/src/infrastructure/fetch/FetchManifestRepository.ts`:

```ts
import {
  LanguageCode,
  TranslatableField,
  TranslatedField,
  Translation,
  TranslationManifest,
  isTranslationStatus,
} from "@bafu/domain";
import type { ManifestQueryRepository, DatasetSummary } from "../../application/ports/ManifestQueryRepository";

export class FetchManifestRepository implements ManifestQueryRepository {
  constructor(private readonly baseUrl: string = import.meta.env.BASE_URL) {}

  async listDatasets(): Promise<DatasetSummary[]> {
    const response = await fetch(`${this.baseUrl}index.json`);
    if (!response.ok) {
      throw new Error(`FetchManifestRepository: failed to load index.json (${response.status})`);
    }
    return response.json();
  }

  async loadManifest(processId: string): Promise<TranslationManifest> {
    const xml = await this.fetchText(`process_${processId}.xml`);
    const root = this.parseRoot(xml, "translationManifest", processId);
    const fields = Array.from(root.querySelectorAll("field")).map((el) =>
      TranslatableField.create({
        path: el.getAttribute("path") ?? "",
        text: el.getAttribute("text") ?? "",
        hash: el.getAttribute("hash") ?? "",
        exchangeNumber: el.getAttribute("exchangeNumber") ?? undefined,
      }),
    );
    return TranslationManifest.create({
      processId: root.getAttribute("processId") ?? processId,
      sourceLanguage: root.getAttribute("sourceLanguage") ?? "en",
      extractedAt: new Date(root.getAttribute("extractedAt") ?? Date.now()),
      fields,
    });
  }

  async loadTranslation(processId: string, language: LanguageCode): Promise<Translation | null> {
    const response = await fetch(`${this.baseUrl}process_${processId}.${language.toString()}.xml`);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`FetchManifestRepository: failed to load translation for ${processId} (${response.status})`);
    }
    const xml = await response.text();
    const root = this.parseRoot(xml, "translation", processId);
    const fields = Array.from(root.querySelectorAll("field")).map((el) => {
      const status = el.getAttribute("status") ?? "";
      if (!isTranslationStatus(status)) {
        throw new Error(`FetchManifestRepository: unknown status "${status}" for ${processId}`);
      }
      return TranslatedField.create({
        path: el.getAttribute("path") ?? "",
        text: el.getAttribute("text") ?? "",
        sourceHash: el.getAttribute("sourceHash") ?? "",
        status,
      });
    });
    return Translation.create({
      processId: root.getAttribute("processId") ?? processId,
      language: LanguageCode.create(root.getAttribute("language") ?? language.toString()),
      translator: root.getAttribute("translator") ?? "",
      generatedAt: new Date(root.getAttribute("generatedAt") ?? Date.now()),
      fields,
    });
  }

  private async fetchText(path: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}${path}`);
    if (!response.ok) {
      throw new Error(`FetchManifestRepository: failed to load ${path} (${response.status})`);
    }
    return response.text();
  }

  private parseRoot(xml: string, tagName: string, processId: string): Element {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const root = doc.querySelector(tagName);
    if (!root) {
      throw new Error(`FetchManifestRepository: malformed ${tagName} for ${processId}`);
    }
    return root;
  }
}
```

- [ ] **Step 3: Run to verify it passes**

Run: `npm test --workspace=@bafu/viewer` — Expected: PASS (all 4 tests)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(viewer): add FetchManifestRepository"
```

---

### Task 4: `DatasetList` component

**Files:**
- Create: `packages/viewer/src/ui/DatasetList.tsx` (+ `.test.tsx`)

**Interfaces:**
- Consumes: `ManifestQueryRepository`, `DatasetSummary` (Task 1), `ListDatasetsUseCase` (Task 1)
- Produces: `DatasetList({ repository, onSelect }): JSX.Element` — this is what Task 6's `App` renders

- [ ] **Step 1: Write the failing tests**

Create `packages/viewer/src/ui/DatasetList.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DatasetList } from "./DatasetList";
import type { ManifestQueryRepository, DatasetSummary } from "../application/ports/ManifestQueryRepository";

class FakeRepository implements ManifestQueryRepository {
  constructor(private readonly datasets: DatasetSummary[]) {}
  async listDatasets(): Promise<DatasetSummary[]> {
    return this.datasets;
  }
  async loadManifest(): Promise<never> {
    throw new Error("not used in this test");
  }
  async loadTranslation(): Promise<null> {
    return null;
  }
}

describe("DatasetList", () => {
  it("renders a button per dataset and calls onSelect when clicked", async () => {
    const repository = new FakeRepository([
      { processId: "abc", displayName: "Natural gas, liquefied" },
      { processId: "def", displayName: "Tap water" },
    ]);
    const onSelect = vi.fn();

    render(<DatasetList repository={repository} onSelect={onSelect} />);

    await waitFor(() => expect(screen.getByText("Natural gas, liquefied")).toBeInTheDocument());
    expect(screen.getByText("Tap water")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Natural gas, liquefied"));
    expect(onSelect).toHaveBeenCalledWith("abc");
  });

  it("shows an error message if loading fails", async () => {
    const repository: ManifestQueryRepository = {
      listDatasets: () => Promise.reject(new Error("network down")),
      loadManifest: () => Promise.reject(new Error("not used")),
      loadTranslation: () => Promise.resolve(null),
    };

    render(<DatasetList repository={repository} onSelect={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("network down"));
  });
});
```

- [ ] **Step 2: Run to verify it fails, then implement**

Run: `npm test --workspace=@bafu/viewer` — Expected: FAIL (module not found)

Create `packages/viewer/src/ui/DatasetList.tsx`:

```tsx
import { useEffect, useState } from "react";
import type { ManifestQueryRepository, DatasetSummary } from "../application/ports/ManifestQueryRepository";
import { ListDatasetsUseCase } from "../application/ListDatasetsUseCase";

export interface DatasetListProps {
  repository: ManifestQueryRepository;
  onSelect: (processId: string) => void;
}

export function DatasetList({ repository, onSelect }: DatasetListProps) {
  const [datasets, setDatasets] = useState<DatasetSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const useCase = new ListDatasetsUseCase(repository);
    useCase
      .execute()
      .then(setDatasets)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }, [repository]);

  if (error) {
    return <p role="alert">Failed to load datasets: {error}</p>;
  }
  if (!datasets) {
    return <p>Loading datasets…</p>;
  }

  return (
    <ul aria-label="datasets">
      {datasets.map((dataset) => (
        <li key={dataset.processId}>
          <button onClick={() => onSelect(dataset.processId)}>{dataset.displayName}</button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: Run to verify it passes**

Run: `npm test --workspace=@bafu/viewer` — Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(viewer): add DatasetList component"
```

---

### Task 5: `FieldRow` + `DatasetDetail` components

**Files:**
- Create: `packages/viewer/src/ui/FieldRow.tsx`
- Create: `packages/viewer/src/ui/DatasetDetail.tsx` (+ `.test.tsx`)

**Interfaces:**
- Consumes: `ManifestQueryRepository` (Task 1), `ViewDatasetUseCase`/`DatasetFieldView` (Task 2), `LanguageCode` from `@bafu/domain`
- Produces: `DatasetDetail({ repository, processId, onBack }): JSX.Element` — this is what Task 6's `App` renders when a dataset is selected

- [ ] **Step 1: Implement `FieldRow` (no independent test — trivial presentational component, covered by `DatasetDetail`'s tests)**

Create `packages/viewer/src/ui/FieldRow.tsx`:

```tsx
import type { DatasetFieldView } from "../application/ViewDatasetUseCase";

export function FieldRow({ field }: { field: DatasetFieldView }) {
  return (
    <tr>
      <td>{field.path}</td>
      <td>{field.sourceText}</td>
      <td>{field.translatedText ?? <em>not translated</em>}</td>
    </tr>
  );
}
```

- [ ] **Step 2: Write the failing tests for `DatasetDetail`**

Create `packages/viewer/src/ui/DatasetDetail.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { LanguageCode, TranslatableField, TranslatedField, Translation, TranslationManifest } from "@bafu/domain";
import { DatasetDetail } from "./DatasetDetail";
import type { ManifestQueryRepository, DatasetSummary } from "../application/ports/ManifestQueryRepository";

const validHash = `sha256:${"a".repeat(64)}`;

class FakeRepository implements ManifestQueryRepository {
  constructor(
    private readonly manifest: TranslationManifest,
    private readonly translation: Translation | null,
  ) {}
  async listDatasets(): Promise<DatasetSummary[]> {
    return [];
  }
  async loadManifest(): Promise<TranslationManifest> {
    return this.manifest;
  }
  async loadTranslation(): Promise<Translation | null> {
    return this.translation;
  }
}

describe("DatasetDetail", () => {
  it("shows source and translated text side by side", async () => {
    const manifest = TranslationManifest.create({
      processId: "abc",
      sourceLanguage: "en",
      extractedAt: new Date(),
      fields: [TranslatableField.create({ path: "referenceFunction/name", text: "Natural gas", hash: validHash })],
    });
    const translation = Translation.create({
      processId: "abc",
      language: LanguageCode.create("ru"),
      translator: "google/translategemma-12b-it",
      generatedAt: new Date(),
      fields: [
        TranslatedField.create({ path: "referenceFunction/name", text: "Природный газ", sourceHash: validHash, status: "draft" }),
      ],
    });

    render(<DatasetDetail repository={new FakeRepository(manifest, translation)} processId="abc" onBack={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("Natural gas")).toBeInTheDocument());
    expect(screen.getByText("Природный газ")).toBeInTheDocument();
  });

  it("shows 'not translated' for a field with no sidecar entry", async () => {
    const manifest = TranslationManifest.create({
      processId: "abc",
      sourceLanguage: "en",
      extractedAt: new Date(),
      fields: [TranslatableField.create({ path: "referenceFunction/name", text: "Natural gas", hash: validHash })],
    });

    render(<DatasetDetail repository={new FakeRepository(manifest, null)} processId="abc" onBack={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("not translated")).toBeInTheDocument());
  });
});
```

- [ ] **Step 3: Run to verify it fails, then implement**

Run: `npm test --workspace=@bafu/viewer` — Expected: FAIL (module not found)

Create `packages/viewer/src/ui/DatasetDetail.tsx`:

```tsx
import { useEffect, useState } from "react";
import { LanguageCode } from "@bafu/domain";
import type { ManifestQueryRepository } from "../application/ports/ManifestQueryRepository";
import { ViewDatasetUseCase, type DatasetView } from "../application/ViewDatasetUseCase";
import { FieldRow } from "./FieldRow";

const TARGET_LANGUAGE = LanguageCode.create("ru");

export interface DatasetDetailProps {
  repository: ManifestQueryRepository;
  processId: string;
  onBack: () => void;
}

export function DatasetDetail({ repository, processId, onBack }: DatasetDetailProps) {
  const [view, setView] = useState<DatasetView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const useCase = new ViewDatasetUseCase(repository);
    useCase
      .execute(processId, TARGET_LANGUAGE)
      .then(setView)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }, [repository, processId]);

  return (
    <div>
      <button onClick={onBack}>&larr; Back</button>
      {error && <p role="alert">Failed to load dataset: {error}</p>}
      {!error && !view && <p>Loading…</p>}
      {view && (
        <table>
          <thead>
            <tr>
              <th>Field</th>
              <th>English</th>
              <th>Russian</th>
            </tr>
          </thead>
          <tbody>
            {view.fields.map((field) => (
              <FieldRow key={field.path} field={field} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test --workspace=@bafu/viewer` — Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(viewer): add FieldRow and DatasetDetail components"
```

---

### Task 6: `App` wiring + manual smoke test against real data

**Files:**
- Create: `packages/viewer/src/ui/App.tsx`
- Create: `packages/viewer/src/main.tsx`

**Interfaces:**
- Consumes: `FetchManifestRepository` (Task 3), `DatasetList` (Task 4), `DatasetDetail` (Task 5)
- Produces: `App(): JSX.Element` — the app's root component, rendered by `main.tsx`

- [ ] **Step 1: Implement `App`**

Create `packages/viewer/src/ui/App.tsx`:

```tsx
import { useState } from "react";
import { FetchManifestRepository } from "../infrastructure/fetch/FetchManifestRepository";
import { DatasetList } from "./DatasetList";
import { DatasetDetail } from "./DatasetDetail";

const repository = new FetchManifestRepository();

export function App() {
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);

  if (selectedProcessId) {
    return <DatasetDetail repository={repository} processId={selectedProcessId} onBack={() => setSelectedProcessId(null)} />;
  }

  return <DatasetList repository={repository} onSelect={setSelectedProcessId} />;
}
```

- [ ] **Step 2: Implement `main.tsx`**

Create `packages/viewer/src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./ui/App";

const container = document.getElementById("root");
if (!container) {
  throw new Error("root element not found");
}
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 3: Typecheck and run the full test suite**

Run: `npm run typecheck --workspace=@bafu/viewer && npm test --workspace=@bafu/viewer`
Expected: both PASS

- [ ] **Step 4: Manually verify against the real data from the pipeline plan**

Run: `npm run dev --workspace=@bafu/viewer`

Open the printed local URL in a browser. Confirm:
- The dataset list shows all 10 `sample-10/` process names (from `translations/index.json`, generated by the pipeline plan's Task 13).
- Clicking a dataset opens its detail view, showing English source text next to real Russian translations.
- A field the model happened to translate identically or a dataset that loaded correctly shows no "not translated" badges (since all 10 were fully translated in the pipeline plan) — if any field unexpectedly shows "not translated", stop and check `translations/` for a missing or malformed sidecar file before continuing.
- The "← Back" button returns to the list.

Stop the dev server (Ctrl+C) once verified.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(viewer): wire up App and main entry point"
```

---

### Task 7: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: root `npm run typecheck`/`npm run lint`/`npm test` (already defined in the pipeline plan's Task 1, and already cover `@bafu/viewer` automatically since they run `--workspaces --if-present`)

- [ ] **Step 1: Create the workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test
```

- [ ] **Step 2: Verify the same commands pass locally before relying on CI**

Run: `npm ci && npm run typecheck && npm run lint && npm test`
Expected: all PASS across `@bafu/domain`, `@bafu/pipeline`, and `@bafu/viewer`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "ci: add GitHub Actions workflow (typecheck, lint, test)"
```

---

### Task 8: Create the GitHub repository and push

**Files:** none (repository/remote setup only)

**Interfaces:** none

**Before this task:** confirm with the user the exact repository name and that they're ready for this code (including the committed `translations/` data) to be pushed to GitHub — see Global Constraints above.

- [ ] **Step 1: Create the GitHub repository**

Run (replace `<repo-name>` with the name confirmed with the user):

```bash
gh repo create <repo-name> --private --source=. --remote=origin
```

Use `--private` unless the user has explicitly said the repository itself (not just the deployed site) should be public.

- [ ] **Step 2: Push**

```bash
git push -u origin main
```

- [ ] **Step 3: Verify CI ran and passed**

Run: `gh run list --limit 1`
Expected: the most recent run for the CI workflow shows `completed` / `success`. If it failed, open it with `gh run view --log-failed` and fix before continuing.

---

### Task 9: GitHub Pages deployment

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: `@bafu/viewer`'s `build` script (Task 1), the GitHub repository (Task 8)

**Before this task:** re-confirm with the user that the *deployed site* should be public — GitHub Pages serves publicly even if the source repo is private, and this is the actual "is our data public" decision flagged in the spec's §6.

- [ ] **Step 1: Create the deploy workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy Viewer to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build --workspace=@bafu/viewer
      - uses: actions/upload-pages-artifact@v3
        with:
          path: packages/viewer/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Enable GitHub Pages for this repository**

Run: `gh api repos/{owner}/{repo}/pages -X POST -f build_type=workflow`

If that returns an error because Pages is already configured, that's fine — continue.

- [ ] **Step 3: Commit and push**

```bash
git add -A
git commit -m "ci: add GitHub Pages deployment workflow"
git push
```

- [ ] **Step 4: Verify the live deployment**

Run: `gh run list --workflow=deploy.yml --limit 1`
Expected: `completed` / `success`.

Then: `gh api repos/{owner}/{repo}/pages --jq .html_url` to get the live URL, open it in a browser, and repeat the checks from Task 6 Step 4 (dataset list loads, clicking a dataset shows real English/Russian side by side) against the deployed site instead of the local dev server.

---

## Self-Review Notes

- **Spec coverage:** monorepo layout (§1) → Task 1; demo scope, real pipeline data (§2) → prerequisite + Task 6; `ManifestQueryRepository`/`FetchManifestRepository`/dataset discovery via `index.json` (§3) → Tasks 1, 3; UI shape, hardcoded `ru`, grouped-by-section rendering (§3) → Tasks 4, 5, 6 (note: field grouping-by-section is achieved implicitly by the manifest's field ordering — `referenceFunction` fields are extracted first, then `geography`/`technology`, then each `exchange` in order per `EcoSpoldXmlParser`, so the flat table already renders in that order without needing explicit grouping logic); error handling ("not translated" is not an error) (§4) → Task 5's `FieldRow`; testing (§4) → Tasks 1-5 each ship their own test; CI (§5) → Task 7; GitHub Pages deployment, base-path correctness (§5) → Task 9, with the `base: "./"` + `import.meta.env.BASE_URL` fix in Tasks 1/3 so it works under any subpath; public-hosting confirmation (§6) → called out explicitly in Global Constraints and re-confirmed before Tasks 8 and 9.
- **Placeholder scan:** no TBD/TODO; every step has real, complete code.
- **Type consistency:** `DatasetSummary`, `ManifestQueryRepository`, `DatasetFieldView`, `DatasetView` are each defined once (Tasks 1, 2) and referenced identically by every later task/component that uses them.
- **Fixed during review:** the original draft of `FetchManifestRepository` used hardcoded root-absolute fetch paths (`/index.json` etc.), which would 404 under a GitHub Pages project subpath. Reworked to use `import.meta.env.BASE_URL` (paired with `base: "./"` in `vite.config.ts`) so the same code works locally, at a domain root, or under a Pages subpath without hardcoding the repository name.
