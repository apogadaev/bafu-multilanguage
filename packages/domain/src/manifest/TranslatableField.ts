export interface TranslatableFieldProps {
  path: string;
  text: string;
  hash: string;
  exchangeNumber?: string;
}

export class TranslatableField {
  readonly path: string;
  readonly text: string;
  readonly hash: string;
  readonly exchangeNumber?: string;

  private constructor(props: TranslatableFieldProps) {
    this.path = props.path;
    this.text = props.text;
    this.hash = props.hash;
    this.exchangeNumber = props.exchangeNumber;
  }

  static create(props: TranslatableFieldProps): TranslatableField {
    if (props.path.trim().length === 0) {
      throw new Error("TranslatableField.path must not be empty");
    }
    if (!/^sha256:[0-9a-f]{64}$/.test(props.hash)) {
      throw new Error(`TranslatableField.hash must match "sha256:<64 hex chars>", got: "${props.hash}"`);
    }
    return new TranslatableField(props);
  }
}
