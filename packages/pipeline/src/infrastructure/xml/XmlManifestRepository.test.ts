import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TranslatableField, TranslationManifest } from "@bafu/domain";
import { XmlManifestRepository } from "./XmlManifestRepository";

let dir: string;

afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
});

describe("XmlManifestRepository", () => {
  it("round-trips a manifest through save and load", async () => {
    dir = await mkdtemp(join(tmpdir(), "bafu-manifest-"));
    const repo = new XmlManifestRepository(dir);
    const manifest = TranslationManifest.create({
      processId: "001835f5-ba6d-361a-8990-7c894d80c087",
      sourceLanguage: "en",
      extractedAt: new Date("2026-09-22T10:00:00.000Z"),
      fields: [
        TranslatableField.create({ path: "referenceFunction/name", text: "Natural gas, liquefied", hash: `sha256:${"a".repeat(64)}` }),
        TranslatableField.create({
          path: "exchange[1]/name",
          text: "Natural gas, at liquefaction plant",
          hash: `sha256:${"b".repeat(64)}`,
          exchangeNumber: "275867",
        }),
      ],
    });

    await repo.save(manifest);
    const loaded = await repo.load("001835f5-ba6d-361a-8990-7c894d80c087");

    expect(loaded.processId).toBe(manifest.processId);
    expect(loaded.sourceLanguage).toBe("en");
    expect(loaded.extractedAt.toISOString()).toBe("2026-09-22T10:00:00.000Z");
    expect(loaded.fields).toHaveLength(2);
    expect(loaded.fields[0].path).toBe("referenceFunction/name");
    expect(loaded.fields[0].text).toBe("Natural gas, liquefied");
    expect(loaded.fields[1].exchangeNumber).toBe("275867");
  });
});
