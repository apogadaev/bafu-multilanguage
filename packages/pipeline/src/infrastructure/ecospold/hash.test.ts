import { describe, it, expect } from "vitest";
import { sha256Hex } from "./hash";

describe("sha256Hex", () => {
  it("produces a sha256:<64 hex chars> string", () => {
    expect(sha256Hex("Natural gas, liquefied")).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("is deterministic for the same input", () => {
    expect(sha256Hex("same text")).toBe(sha256Hex("same text"));
  });

  it("trims surrounding whitespace before hashing", () => {
    expect(sha256Hex("  padded  ")).toBe(sha256Hex("padded"));
  });

  it("produces different hashes for different input", () => {
    expect(sha256Hex("a")).not.toBe(sha256Hex("b"));
  });
});
