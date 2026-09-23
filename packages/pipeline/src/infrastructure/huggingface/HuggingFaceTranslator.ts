import { LanguageCode, TranslatedField, Translation, TranslationManifest } from "@bafu/domain";
import type { Translator } from "@bafu/domain";

export class HuggingFaceTranslator implements Translator {
  constructor(
    private readonly endpointUrl: string,
    private readonly apiToken: string,
  ) {}

  async translate(manifest: TranslationManifest, targetLanguage: LanguageCode, translatorId: string): Promise<Translation> {
    const translatedFields: TranslatedField[] = [];
    for (const field of manifest.fields) {
      const text = await this.translateOne(field.text, manifest.sourceLanguage, targetLanguage.toString(), translatorId);
      translatedFields.push(TranslatedField.create({ path: field.path, text, sourceHash: field.hash, status: "draft" }));
    }

    return Translation.create({
      processId: manifest.processId,
      language: targetLanguage,
      translator: translatorId,
      generatedAt: new Date(),
      fields: translatedFields,
    });
  }

  private async translateOne(text: string, sourceLang: string, targetLang: string, model: string): Promise<string> {
    const response = await fetch(`${this.endpointUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiToken}` },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: [{ type: "text", source_lang_code: sourceLang, target_lang_code: targetLang, text }],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`HuggingFaceTranslator: request failed (${response.status}) translating "${text.slice(0, 50)}"`);
    }

    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const translated = data.choices?.[0]?.message?.content;
    if (typeof translated !== "string" || translated.length === 0) {
      throw new Error(`HuggingFaceTranslator: no translated text in response for "${text.slice(0, 50)}"`);
    }
    return translated;
  }
}
