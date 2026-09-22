import isoLang from 'iso-639-1';

export class LanguageCode {
  private constructor(readonly value: string) {}

  static create(value: string): LanguageCode {
    if (!isoLang.validate(value)) {
      throw new Error(`LanguageCode must be a valid ISO 639-1 code, got: "${value}"`);
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
