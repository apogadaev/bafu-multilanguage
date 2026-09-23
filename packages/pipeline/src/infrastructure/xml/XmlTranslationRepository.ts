import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { LanguageCode, Translation, TranslatedField, isTranslationStatus } from "@bafu/domain";
import type { TranslationRepository } from "../../application/ports/TranslationRepository";

const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: "@_", format: true });
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

export class XmlTranslationRepository implements TranslationRepository {
  constructor(private readonly outputDir: string) {}

  async save(translation: Translation): Promise<void> {
    await mkdir(this.outputDir, { recursive: true });
    const xmlObject = {
      translation: {
        "@_processId": translation.processId,
        "@_language": translation.language.toString(),
        "@_translator": translation.translator,
        "@_generatedAt": translation.generatedAt.toISOString(),
        field: translation.fields.map((f) => ({
          "@_path": f.path,
          "@_text": f.text,
          "@_sourceHash": f.sourceHash,
          "@_status": f.status,
        })),
      },
    };
    await writeFile(this.filePath(translation.processId, translation.language), builder.build(xmlObject), "utf8");
  }

  async load(processId: string, language: LanguageCode): Promise<Translation | null> {
    const filePath = this.filePath(processId, language);
    if (!existsSync(filePath)) {
      return null;
    }
    const xml = await readFile(filePath, "utf8");
    const doc = parser.parse(xml);
    const root = doc.translation;
    const rawFields = Array.isArray(root.field) ? root.field : [root.field];
    const fields = rawFields.map((f: Record<string, string>) => {
      const status = f["@_status"];
      if (!isTranslationStatus(status)) {
        throw new Error(`Unknown translation status "${status}" in ${filePath}`);
      }
      return TranslatedField.create({ path: f["@_path"], text: f["@_text"], sourceHash: f["@_sourceHash"], status });
    });
    return Translation.create({
      processId: root["@_processId"],
      language: LanguageCode.create(root["@_language"]),
      translator: root["@_translator"],
      generatedAt: new Date(root["@_generatedAt"]),
      fields,
    });
  }

  private filePath(processId: string, language: LanguageCode): string {
    return join(this.outputDir, `process_${processId}.${language.toString()}.xml`);
  }
}
