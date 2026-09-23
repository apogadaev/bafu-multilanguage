import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { LanguageCode } from "@bafu/domain";
import type { Translator } from "@bafu/domain";
import { XmlManifestRepository } from "../../infrastructure/xml/XmlManifestRepository";
import { XmlTranslationRepository } from "../../infrastructure/xml/XmlTranslationRepository";
import { HuggingFaceTranslator } from "../../infrastructure/huggingface/HuggingFaceTranslator";
import { TranslateProcessUseCase } from "../../application/TranslateProcessUseCase";
import type { DatasetIndexEntry } from "./extract";

export async function translateBatch(
  translationsDir: string,
  language: LanguageCode,
  translatorId: string,
  translator: Translator,
): Promise<void> {
  const index: DatasetIndexEntry[] = JSON.parse(await readFile(join(translationsDir, "index.json"), "utf8"));
  const manifestRepository = new XmlManifestRepository(translationsDir);
  const translationRepository = new XmlTranslationRepository(translationsDir);
  const useCase = new TranslateProcessUseCase(manifestRepository, translator, translationRepository);

  for (const entry of index) {
    await useCase.execute(entry.processId, language, translatorId);
    console.log(`Translated ${entry.processId} (${entry.displayName}) -> ${language.toString()}`);
  }
}

async function main(): Promise<void> {
  const translationsDir = process.argv[2] ?? "translations";
  const languageArg = process.argv[3] ?? "ru";
  const translatorId = process.argv[4] ?? "google/translategemma-4b-it";

  const endpointUrl = process.env.HF_ENDPOINT_URL;
  const apiToken = process.env.HF_TOKEN;
  if (!endpointUrl || !apiToken) {
    throw new Error("HF_ENDPOINT_URL and HF_TOKEN environment variables must both be set to run translation");
  }

  const language = LanguageCode.create(languageArg);
  const translator = new HuggingFaceTranslator(endpointUrl, apiToken);

  await translateBatch(translationsDir, language, translatorId, translator);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
