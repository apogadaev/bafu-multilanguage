import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { TranslatableField } from "@bafu/domain";
import { EcoSpoldXmlParser } from "./EcoSpoldXmlParser";
import type { SourceRepository, SourceRecord } from "../../application/ports/SourceRepository";

export class EcoSpoldSourceRepository implements SourceRepository {
  private readonly parser = new EcoSpoldXmlParser();

  constructor(private readonly sourceDir: string) {}

  async load(processId: string): Promise<SourceRecord> {
    const filePath = join(this.sourceDir, `process_${processId}.xml`);
    const xml = await readFile(filePath, "utf8");
    const fields: TranslatableField[] = this.parser.parse(xml);
    return { processId, fields };
  }
}
