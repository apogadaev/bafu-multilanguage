export class LanguageCode {
  private constructor(readonly value: string) {}

  static create(value: string): LanguageCode {
    if (!/^[a-z]{2}$/.test(value)) {
      throw new Error(`LanguageCode must be a two-letter lowercase ISO 639-1 code, got: "${value}"`);
    }
    return new LanguageCode(value);
  }

  equals(other: LanguageCode): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
