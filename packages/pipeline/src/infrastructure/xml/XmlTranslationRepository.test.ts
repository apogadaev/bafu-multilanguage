import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LanguageCode, Translation, TranslatedField } from "@bafu/domain";
import { XmlTranslationRepository } from "./XmlTranslationRepository";

let dir: string;

afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
});

describe("XmlTranslationRepository", () => {
  it("round-trips a translation through save and load", async () => {
    dir = await mkdtemp(join(tmpdir(), "bafu-translation-"));
    const repo = new XmlTranslationRepository(dir);
    const translation = Translation.create({
      processId: "001835f5-ba6d-361a-8990-7c894d80c087",
      language: LanguageCode.create("ru"),
      translator: "claude-opus-5",
      generatedAt: new Date("2026-09-22T10:05:00.000Z"),
      fields: [
        TranslatedField.create({
          path: "referenceFunction/name",
          text: "Природный газ, сжиженный",
          sourceHash: `sha256:${"a".repeat(64)}`,
          status: "draft",
        }),
      ],
    });

    await repo.save(translation);
    const loaded = await repo.load("001835f5-ba6d-361a-8990-7c894d80c087", LanguageCode.create("ru"));

    expect(loaded).not.toBeNull();
    expect(loaded?.translator).toBe("claude-opus-5");
    expect(loaded?.fields[0].text).toBe("Природный газ, сжиженный");
    expect(loaded?.fields[0].status).toBe("draft");
  });

  it("returns null when no translation exists for that process/language", async () => {
    dir = await mkdtemp(join(tmpdir(), "bafu-translation-"));
    const repo = new XmlTranslationRepository(dir);
    const result = await repo.load("nonexistent", LanguageCode.create("fr"));
    expect(result).toBeNull();
  });

  it("round-trips a translation with multiple fields", async () => {
    dir = await mkdtemp(join(tmpdir(), "bafu-translation-"));
    const repo = new XmlTranslationRepository(dir);
    const translation = Translation.create({
      processId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      language: LanguageCode.create("de"),
      translator: "claude-sonnet-4",
      generatedAt: new Date("2026-09-22T14:30:00.000Z"),
      fields: [
        TranslatedField.create({
          path: "section/title",
          text: "Abschnitt",
          sourceHash: `sha256:${"b".repeat(64)}`,
          status: "draft",
        }),
        TranslatedField.create({
          path: "section/description",
          text: "Dies ist eine Beschreibung",
          sourceHash: `sha256:${"c".repeat(64)}`,
          status: "draft",
        }),
        TranslatedField.create({
          path: "section/note",
          text: "Notiz",
          sourceHash: `sha256:${"d".repeat(64)}`,
          status: "draft",
        }),
      ],
    });

    await repo.save(translation);
    const loaded = await repo.load("f47ac10b-58cc-4372-a567-0e02b2c3d479", LanguageCode.create("de"));

    expect(loaded).not.toBeNull();
    expect(loaded?.fields).toHaveLength(3);
    expect(loaded?.fields[0]).toMatchObject({
      path: "section/title",
      text: "Abschnitt",
      sourceHash: `sha256:${"b".repeat(64)}`,
      status: "draft",
    });
    expect(loaded?.fields[1]).toMatchObject({
      path: "section/description",
      text: "Dies ist eine Beschreibung",
      sourceHash: `sha256:${"c".repeat(64)}`,
      status: "draft",
    });
    expect(loaded?.fields[2]).toMatchObject({
      path: "section/note",
      text: "Notiz",
      sourceHash: `sha256:${"d".repeat(64)}`,
      status: "draft",
    });
  });
});
