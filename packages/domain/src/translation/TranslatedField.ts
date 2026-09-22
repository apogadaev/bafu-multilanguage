import { TranslationStatus } from "./TranslationStatus";

export interface TranslatedFieldProps {
  path: string;
  text: string;
  sourceHash: string;
  status: TranslationStatus;
}

export class TranslatedField {
  readonly path: string;
  readonly text: string;
  readonly sourceHash: string;
  readonly status: TranslationStatus;

  private constructor(props: TranslatedFieldProps) {
    this.path = props.path;
    this.text = props.text;
    this.sourceHash = props.sourceHash;
    this.status = props.status;
  }

  static create(props: TranslatedFieldProps): TranslatedField {
    if (props.path.trim().length === 0) {
      throw new Error("TranslatedField.path must not be empty");
    }
    if (!/^sha256:[0-9a-f]{64}$/.test(props.sourceHash)) {
      throw new Error(`TranslatedField.sourceHash must match "sha256:<64 hex chars>", got: "${props.sourceHash}"`);
    }
    return new TranslatedField(props);
  }
}
