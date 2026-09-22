import type { LanguageCode, Translation } from "@bafu/domain";

export interface TranslationRepository {
  save(translation: Translation): Promise<void>;
  load(processId: string, language: LanguageCode): Promise<Translation | null>;
}
