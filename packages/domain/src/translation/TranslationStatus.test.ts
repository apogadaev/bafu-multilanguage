import { describe, it, expect } from "vitest";
import { isTranslationStatus } from "./TranslationStatus";

describe("isTranslationStatus", () => {
  it("accepts 'draft'", () => {
    expect(isTranslationStatus("draft")).toBe(true);
  });

  it("rejects an unknown status", () => {
    expect(isTranslationStatus("approved")).toBe(false);
  });
});
