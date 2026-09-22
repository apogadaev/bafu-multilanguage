import type { TranslationManifest } from "@bafu/domain";

export interface ManifestRepository {
  save(manifest: TranslationManifest): Promise<void>;
  load(processId: string): Promise<TranslationManifest>;
}
