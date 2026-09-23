import { readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { EcoSpoldSourceRepository } from "../../infrastructure/ecospold/EcoSpoldSourceRepository";
import { XmlManifestRepository } from "../../infrastructure/xml/XmlManifestRepository";
import { ExtractManifestUseCase } from "../../application/ExtractManifestUseCase";

export interface DatasetIndexEntry {
  processId: string;
  displayName: string;
}

export async function extractBatch(sourceDir: string, outputDir: string): Promise<DatasetIndexEntry[]> {
  const files = (await readdir(sourceDir)).filter((f) => f.startsWith("process_") && f.endsWith(".xml"));
  const sourceRepository = new EcoSpoldSourceRepository(sourceDir);
  const manifestRepository = new XmlManifestRepository(outputDir);
  const useCase = new ExtractManifestUseCase(sourceRepository, manifestRepository);

  const index: DatasetIndexEntry[] = [];
  for (const file of files) {
    const processId = file.slice("process_".length, -".xml".length);
    const manifest = await useCase.execute(processId);
    const displayName = manifest.findField("referenceFunction/name")?.text ?? processId;
    index.push({ processId, displayName });
  }

  index.sort((a, b) => a.displayName.localeCompare(b.displayName));
  await writeFile(join(outputDir, "index.json"), JSON.stringify(index, null, 2), "utf8");
  return index;
}

async function main(): Promise<void> {
  const sourceDir = process.argv[2] ?? "sample-10";
  const outputDir = process.argv[3] ?? "translations";
  const index = await extractBatch(sourceDir, outputDir);
  console.log(`Extracted ${index.length} manifest(s) into ${outputDir}/`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
