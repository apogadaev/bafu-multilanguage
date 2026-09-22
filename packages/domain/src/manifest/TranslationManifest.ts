import { TranslatableField } from "./TranslatableField";

export interface TranslationManifestProps {
  processId: string;
  sourceLanguage: string;
  extractedAt: Date;
  fields: TranslatableField[];
}

export class TranslationManifest {
  readonly processId: string;
  readonly sourceLanguage: string;
  readonly extractedAt: Date;
  readonly fields: TranslatableField[];

  private constructor(props: TranslationManifestProps) {
    this.processId = props.processId;
    this.sourceLanguage = props.sourceLanguage;
    this.extractedAt = props.extractedAt;
    this.fields = props.fields;
  }

  static create(props: TranslationManifestProps): TranslationManifest {
    if (props.processId.trim().length === 0) {
      throw new Error("TranslationManifest.processId must not be empty");
    }
    if (props.fields.length === 0) {
      throw new Error("TranslationManifest.fields must not be empty");
    }
    return new TranslationManifest(props);
  }

  findField(path: string): TranslatableField | undefined {
    return this.fields.find((f) => f.path === path);
  }
}
