import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { EcoSpoldSourceRepository } from "./EcoSpoldSourceRepository";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLE_DIR = join(__dirname, "../../../../../sample-10");

describe("EcoSpoldSourceRepository", () => {
  it("loads and parses a real process file by id", async () => {
    const repo = new EcoSpoldSourceRepository(SAMPLE_DIR);
    const record = await repo.load("001835f5-ba6d-361a-8990-7c894d80c087");

    expect(record.processId).toBe("001835f5-ba6d-361a-8990-7c894d80c087");
    expect(record.fields).toHaveLength(18);
    expect(record.fields.find((f) => f.path === "referenceFunction/name")?.text).toBe(
      "Natural gas, liquefied, production AE, at freight ship",
    );
  });

  it("rejects with an error for a process id that has no file", async () => {
    const repo = new EcoSpoldSourceRepository(SAMPLE_DIR);
    await expect(repo.load("00000000-0000-0000-0000-000000000000")).rejects.toThrow();
  });
});
