import { TranslationManifest } from "./manifest/TranslationManifest";
import { Translation } from "./translation/Translation";
import { LanguageCode } from "./translation/LanguageCode";

export interface Translator {
  translate(manifest: TranslationManifest, targetLanguage: LanguageCode, translatorId: string): Promise<Translation>;
}
