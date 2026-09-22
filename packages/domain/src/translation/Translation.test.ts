import { describe, it, expect } from "vitest";
import { Translation } from "./Translation";
import { TranslatedField } from "./TranslatedField";
import { LanguageCode } from "./LanguageCode";

const validHash = `sha256:${"a".repeat(64)}`;
const field = TranslatedField.create({ path: "referenceFunction/name", text: "Природный газ", sourceHash: validHash, status: "draft" });

describe("Translation", () => {
  it("creates a translation with at least one field", () => {
    const translation = Translation.create({
      processId: "abc",
      language: LanguageCode.create("ru"),
      translator: "claude-opus-5",
      generatedAt: new Date(),
      fields: [field],
    });
    expect(translation.processId).toBe("abc");
    expect(translation.language.toString()).toBe("ru");
    expect(translation.fields).toHaveLength(1);
  });

  it("rejects an empty processId", () => {
    expect(() =>
      Translation.create({ processId: "", language: LanguageCode.create("ru"), translator: "x", generatedAt: new Date(), fields: [field] }),
    ).toThrow(/processId must not be empty/);
  });

  it("rejects an empty fields array", () => {
    expect(() =>
      Translation.create({ processId: "abc", language: LanguageCode.create("ru"), translator: "x", generatedAt: new Date(), fields: [] }),
    ).toThrow(/fields must not be empty/);
  });

  it("rejects an empty translator id", () => {
    expect(() =>
      Translation.create({ processId: "abc", language: LanguageCode.create("ru"), translator: "", generatedAt: new Date(), fields: [field] }),
    ).toThrow(/translator must not be empty/);
  });
});
