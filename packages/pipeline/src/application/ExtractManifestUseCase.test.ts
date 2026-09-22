import { describe, it, expect } from "vitest";
import { TranslatableField, TranslationManifest } from "@bafu/domain";
import { ExtractManifestUseCase } from "./ExtractManifestUseCase";
import type { SourceRepository, SourceRecord } from "./ports/SourceRepository";
import type { ManifestRepository } from "./ports/ManifestRepository";

const validHash = `sha256:${"a".repeat(64)}`;

class FakeSourceRepository implements SourceRepository {
  constructor(private readonly record: SourceRecord) {}
  async load(): Promise<SourceRecord> {
    return this.record;
  }
}

class FakeManifestRepository implements ManifestRepository {
  saved: TranslationManifest[] = [];
  async save(manifest: TranslationManifest): Promise<void> {
    this.saved.push(manifest);
  }
  async load(): Promise<TranslationManifest> {
    throw new Error("not implemented in fake");
  }
}

describe("ExtractManifestUseCase", () => {
  it("builds a manifest from the source repository and saves it", async () => {
    const field = TranslatableField.create({ path: "referenceFunction/name", text: "Natural gas", hash: validHash });
    const sourceRepo = new FakeSourceRepository({ processId: "abc-123", fields: [field] });
    const manifestRepo = new FakeManifestRepository();
    const useCase = new ExtractManifestUseCase(sourceRepo, manifestRepo);

    const manifest = await useCase.execute("abc-123");

    expect(manifest.processId).toBe("abc-123");
    expect(manifest.sourceLanguage).toBe("en");
    expect(manifest.fields).toEqual([field]);
    expect(manifestRepo.saved).toHaveLength(1);
    expect(manifestRepo.saved[0]).toBe(manifest);
  });
});
