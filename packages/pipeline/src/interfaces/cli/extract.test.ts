import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { extractBatch } from "./extract";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLE_DIR = join(__dirname, "../../../../../sample-10");

let outputDir: string;

afterEach(async () => {
  if (outputDir) await rm(outputDir, { recursive: true, force: true });
});

describe("extractBatch", () => {
  it("extracts a manifest for every process file and writes an index", async () => {
    outputDir = await mkdtemp(join(tmpdir(), "bafu-extract-"));

    const index = await extractBatch(SAMPLE_DIR, outputDir);

    expect(index).toHaveLength(10);
    expect(index.every((e) => e.processId.length > 0 && e.displayName.length > 0)).toBe(true);

    const indexFile = JSON.parse(await readFile(join(outputDir, "index.json"), "utf8"));
    expect(indexFile).toEqual(index);

    const natGas = index.find((e) => e.processId === "001835f5-ba6d-361a-8990-7c894d80c087");
    expect(natGas?.displayName).toBe("Natural gas, liquefied, production AE, at freight ship");
  });
});
