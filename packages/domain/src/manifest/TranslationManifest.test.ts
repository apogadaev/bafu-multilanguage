import { describe, it, expect } from "vitest";
import { TranslationManifest } from "./TranslationManifest";
import { TranslatableField } from "./TranslatableField";

const validHash = `sha256:${"a".repeat(64)}`;
const field = TranslatableField.create({ path: "referenceFunction/name", text: "Natural gas", hash: validHash });

describe("TranslationManifest", () => {
  it("creates a manifest with at least one field", () => {
    const manifest = TranslationManifest.create({
      processId: "001835f5-ba6d-361a-8990-7c894d80c087",
      sourceLanguage: "en",
      extractedAt: new Date("2026-09-22T10:00:00Z"),
      fields: [field],
    });
    expect(manifest.processId).toBe("001835f5-ba6d-361a-8990-7c894d80c087");
    expect(manifest.fields).toHaveLength(1);
  });

  it("rejects an empty processId", () => {
    expect(() =>
      TranslationManifest.create({ processId: "", sourceLanguage: "en", extractedAt: new Date(), fields: [field] }),
    ).toThrow(/processId must not be empty/);
  });

  it("rejects an empty fields array", () => {
    expect(() =>
      TranslationManifest.create({ processId: "abc", sourceLanguage: "en", extractedAt: new Date(), fields: [] }),
    ).toThrow(/fields must not be empty/);
  });

  it("findField returns the matching field by path", () => {
    const manifest = TranslationManifest.create({
      processId: "abc",
      sourceLanguage: "en",
      extractedAt: new Date(),
      fields: [field],
    });
    expect(manifest.findField("referenceFunction/name")).toBe(field);
    expect(manifest.findField("nonexistent")).toBeUndefined();
  });
});
