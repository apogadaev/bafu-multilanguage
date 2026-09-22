import { describe, it, expect } from "vitest";
import { LanguageCode } from "./LanguageCode";

describe("LanguageCode", () => {
  it("accepts a valid two-letter lowercase code", () => {
    const lang = LanguageCode.create("ru");
    expect(lang.value).toBe("ru");
    expect(lang.toString()).toBe("ru");
  });

  it("rejects an uppercase code", () => {
    expect(() => LanguageCode.create("RU")).toThrow(/two-letter lowercase/);
  });

  it("rejects a three-letter code", () => {
    expect(() => LanguageCode.create("rus")).toThrow(/two-letter lowercase/);
  });

  it("rejects an empty string", () => {
    expect(() => LanguageCode.create("")).toThrow(/two-letter lowercase/);
  });

  it("two LanguageCodes with the same value are equal", () => {
    expect(LanguageCode.create("ru").equals(LanguageCode.create("ru"))).toBe(true);
  });

  it("two LanguageCodes with different values are not equal", () => {
    expect(LanguageCode.create("ru").equals(LanguageCode.create("de"))).toBe(false);
  });
});
