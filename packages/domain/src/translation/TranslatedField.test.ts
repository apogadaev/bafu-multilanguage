import { describe, it, expect } from "vitest";
import { TranslatedField } from "./TranslatedField";

const validHash = `sha256:${"a".repeat(64)}`;

describe("TranslatedField", () => {
  it("creates a translated field", () => {
    const field = TranslatedField.create({
      path: "referenceFunction/name",
      text: "Природный газ",
      sourceHash: validHash,
      status: "draft",
    });
    expect(field.text).toBe("Природный газ");
    expect(field.status).toBe("draft");
  });

  it("rejects an empty path", () => {
    expect(() =>
      TranslatedField.create({ path: "", text: "x", sourceHash: validHash, status: "draft" }),
    ).toThrow(/path must not be empty/);
  });

  it("rejects a malformed sourceHash", () => {
    expect(() =>
      TranslatedField.create({ path: "a/b", text: "x", sourceHash: "bad", status: "draft" }),
    ).toThrow(/sourceHash must match/);
  });
});
