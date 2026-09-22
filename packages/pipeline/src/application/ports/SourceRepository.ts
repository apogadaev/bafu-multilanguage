import type { TranslatableField } from "@bafu/domain";

export interface SourceRecord {
  processId: string;
  fields: TranslatableField[];
}

export interface SourceRepository {
  load(processId: string): Promise<SourceRecord>;
}
