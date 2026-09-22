export type TranslationStatus = "draft";

const VALID_STATUSES: readonly TranslationStatus[] = ["draft"];

export function isTranslationStatus(value: string): value is TranslationStatus {
  return (VALID_STATUSES as readonly string[]).includes(value);
}
