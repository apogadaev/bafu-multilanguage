import { LanguageCode } from "./LanguageCode";
import { TranslatedField } from "./TranslatedField";

export interface TranslationProps {
  processId: string;
  language: LanguageCode;
  translator: string;
  generatedAt: Date;
  fields: TranslatedField[];
}

export class Translation {
  readonly processId: string;
  readonly language: LanguageCode;
  readonly translator: string;
  readonly generatedAt: Date;
  readonly fields: TranslatedField[];

  private constructor(props: TranslationProps) {
    this.processId = props.processId;
    this.language = props.language;
    this.translator = props.translator;
    this.generatedAt = props.generatedAt;
    this.fields = props.fields;
  }

  static create(props: TranslationProps): Translation {
    if (props.processId.trim().length === 0) {
      throw new Error("Translation.processId must not be empty");
    }
    if (props.fields.length === 0) {
      throw new Error("Translation.fields must not be empty");
    }
    if (props.translator.trim().length === 0) {
      throw new Error("Translation.translator must not be empty");
    }
    return new Translation(props);
  }
}
