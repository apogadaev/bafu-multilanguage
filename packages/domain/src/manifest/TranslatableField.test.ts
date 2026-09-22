import { describe, it, expect } from "vitest";
import { TranslatableField } from "./TranslatableField";

const validHash = `sha256:${"a".repeat(64)}`;

describe("TranslatableField", () => {
  it("creates a field with valid path and hash", () => {
    const field = TranslatableField.create({ path: "referenceFunction/name", text: "Natural gas", hash: validHash });
    expect(field.path).toBe("referenceFunction/name");
    expect(field.text).toBe("Natural gas");
    expect(field.hash).toBe(validHash);
  });

  it("carries an optional exchangeNumber", () => {
    const field = TranslatableField.create({
      path: "exchange[6]/name",
      text: "Electricity",
      hash: validHash,
      exchangeNumber: "219622",
    });
    expect(field.exchangeNumber).toBe("219622");
  });

  it("rejects an empty path", () => {
    expect(() => TranslatableField.create({ path: "", text: "x", hash: validHash })).toThrow(/path must not be empty/);
  });

  it("rejects a malformed hash", () => {
    expect(() => TranslatableField.create({ path: "a/b", text: "x", hash: "not-a-hash" })).toThrow(/hash must match/);
  });
});
