import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { TranslatableField, TranslationManifest } from "@bafu/domain";
import type { ManifestRepository } from "../../application/ports/ManifestRepository";

const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: "@_", format: true });
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

export class XmlManifestRepository implements ManifestRepository {
  constructor(private readonly outputDir: string) {}

  async save(manifest: TranslationManifest): Promise<void> {
    await mkdir(this.outputDir, { recursive: true });
    const xmlObject = {
      translationManifest: {
        "@_processId": manifest.processId,
        "@_sourceLanguage": manifest.sourceLanguage,
        "@_extractedAt": manifest.extractedAt.toISOString(),
        field: manifest.fields.map((f) => ({
          "@_path": f.path,
          "@_text": f.text,
          "@_hash": f.hash,
          ...(f.exchangeNumber ? { "@_exchangeNumber": f.exchangeNumber } : {}),
        })),
      },
    };
    await writeFile(this.filePath(manifest.processId), builder.build(xmlObject), "utf8");
  }

  async load(processId: string): Promise<TranslationManifest> {
    const xml = await readFile(this.filePath(processId), "utf8");
    const doc = parser.parse(xml);
    const root = doc.translationManifest;
    const rawFields = Array.isArray(root.field) ? root.field : [root.field];
    const fields = rawFields.map((f: Record<string, string>) =>
      TranslatableField.create({
        path: f["@_path"],
        text: f["@_text"],
        hash: f["@_hash"],
        exchangeNumber: f["@_exchangeNumber"],
      }),
    );
    return TranslationManifest.create({
      processId: root["@_processId"],
      sourceLanguage: root["@_sourceLanguage"],
      extractedAt: new Date(root["@_extractedAt"]),
      fields,
    });
  }

  private filePath(processId: string): string {
    return join(this.outputDir, `process_${processId}.xml`);
  }
}
