import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { LanguageCode, Translation, TranslatedField, TranslationManifest } from "@bafu/domain";
import type { Translator } from "@bafu/domain";
import { extractBatch } from "./extract";
import { translateBatch } from "./translate";
import { XmlTranslationRepository } from "../../infrastructure/xml/XmlTranslationRepository";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLE_DIR = join(__dirname, "../../../../../sample-10");

class FakeTranslator implements Translator {
  async translate(manifest: TranslationManifest, targetLanguage: LanguageCode, translatorId: string): Promise<Translation> {
    return Translation.create({
      processId: manifest.processId,
      language: targetLanguage,
      translator: translatorId,
      generatedAt: new Date(),
      fields: manifest.fields.map((f) =>
        TranslatedField.create({ path: f.path, text: `[${targetLanguage.toString()}] ${f.text}`, sourceHash: f.hash, status: "draft" }),
      ),
    });
  }
}

let dir: string;

afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
});

describe("translateBatch", () => {
  it("translates every dataset in the index and writes a sidecar per process", async () => {
    dir = await mkdtemp(join(tmpdir(), "bafu-translate-"));
    await extractBatch(SAMPLE_DIR, dir);

    await translateBatch(dir, LanguageCode.create("ru"), "fake-model", new FakeTranslator());

    const translationRepo = new XmlTranslationRepository(dir);
    const translation = await translationRepo.load("001835f5-ba6d-361a-8990-7c894d80c087", LanguageCode.create("ru"));

    expect(translation).not.toBeNull();
    expect(translation?.translator).toBe("fake-model");
    expect(translation?.fields.some((f) => f.text.startsWith("[ru] "))).toBe(true);
  });
});
