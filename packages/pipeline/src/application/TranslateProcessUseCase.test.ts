import { describe, it, expect } from "vitest";
import { LanguageCode, TranslatableField, TranslatedField, Translation, TranslationManifest } from "@bafu/domain";
import type { Translator } from "@bafu/domain";
import { TranslateProcessUseCase } from "./TranslateProcessUseCase";
import type { ManifestRepository } from "./ports/ManifestRepository";
import type { TranslationRepository } from "./ports/TranslationRepository";

const validHash = `sha256:${"a".repeat(64)}`;

class FakeManifestRepository implements ManifestRepository {
  constructor(private readonly manifest: TranslationManifest) {}
  async save(): Promise<void> {
    throw new Error("not implemented in fake");
  }
  async load(): Promise<TranslationManifest> {
    return this.manifest;
  }
}

class FakeTranslator implements Translator {
  calls: { manifestProcessId: string; targetLanguage: string; translatorId: string }[] = [];
  constructor(private readonly result: Translation) {}
  async translate(manifest: TranslationManifest, targetLanguage: LanguageCode, translatorId: string): Promise<Translation> {
    this.calls.push({ manifestProcessId: manifest.processId, targetLanguage: targetLanguage.toString(), translatorId });
    return this.result;
  }
}

class FakeTranslationRepository implements TranslationRepository {
  saved: Translation[] = [];
  async save(translation: Translation): Promise<void> {
    this.saved.push(translation);
  }
  async load(): Promise<Translation | null> {
    return null;
  }
}

describe("TranslateProcessUseCase", () => {
  it("loads the manifest, calls the translator, and saves the result", async () => {
    const manifest = TranslationManifest.create({
      processId: "abc-123",
      sourceLanguage: "en",
      extractedAt: new Date(),
      fields: [TranslatableField.create({ path: "referenceFunction/name", text: "Natural gas", hash: validHash })],
    });
    const translation = Translation.create({
      processId: "abc-123",
      language: LanguageCode.create("ru"),
      translator: "claude-opus-5",
      generatedAt: new Date(),
      fields: [TranslatedField.create({ path: "referenceFunction/name", text: "Природный газ", sourceHash: validHash, status: "draft" })],
    });

    const manifestRepo = new FakeManifestRepository(manifest);
    const translator = new FakeTranslator(translation);
    const translationRepo = new FakeTranslationRepository();
    const useCase = new TranslateProcessUseCase(manifestRepo, translator, translationRepo);

    const result = await useCase.execute("abc-123", LanguageCode.create("ru"), "claude-opus-5");

    expect(result).toBe(translation);
    expect(translator.calls).toEqual([{ manifestProcessId: "abc-123", targetLanguage: "ru", translatorId: "claude-opus-5" }]);
    expect(translationRepo.saved).toEqual([translation]);
  });
});
