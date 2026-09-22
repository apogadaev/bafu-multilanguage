import type { LanguageCode, Translation, Translator } from "@bafu/domain";
import type { ManifestRepository } from "./ports/ManifestRepository";
import type { TranslationRepository } from "./ports/TranslationRepository";

export class TranslateProcessUseCase {
  constructor(
    private readonly manifestRepository: ManifestRepository,
    private readonly translator: Translator,
    private readonly translationRepository: TranslationRepository,
  ) {}

  async execute(processId: string, targetLanguage: LanguageCode, translatorId: string): Promise<Translation> {
    const manifest = await this.manifestRepository.load(processId);
    const translation = await this.translator.translate(manifest, targetLanguage, translatorId);
    await this.translationRepository.save(translation);
    return translation;
  }
}
