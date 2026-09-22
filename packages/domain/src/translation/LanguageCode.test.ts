import { describe, it, expect } from "vitest";
import { LanguageCode } from "./LanguageCode";

describe("LanguageCode", () => {
  it("accepts a valid ISO 639-1 code", () => {
    const lang = LanguageCode.create("ru");
    expect(lang.value).toBe("ru");
    expect(lang.toString()).toBe("ru");
  });

  it("rejects an uppercase code", () => {
    expect(() => LanguageCode.create("RU")).toThrow(/valid ISO 639-1/);
  });

  it("rejects a three-letter code", () => {
    expect(() => LanguageCode.create("rus")).toThrow(/valid ISO 639-1/);
  });

  it("rejects an empty string", () => {
    expect(() => LanguageCode.create("")).toThrow(/valid ISO 639-1/);
  });

  it("rejects a fake two-letter code that is not a real ISO 639-1 language", () => {
    expect(() => LanguageCode.create("zz")).toThrow(/valid ISO 639-1/);
  });

  it("two LanguageCodes with the same value are equal", () => {
    expect(LanguageCode.create("ru").equals(LanguageCode.create("ru"))).toBe(true);
  });

  it("two LanguageCodes with different values are not equal", () => {
    expect(LanguageCode.create("ru").equals(LanguageCode.create("de"))).toBe(false);
  });
});
