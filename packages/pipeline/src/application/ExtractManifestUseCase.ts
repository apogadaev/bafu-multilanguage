import { TranslationManifest } from "@bafu/domain";
import type { SourceRepository } from "./ports/SourceRepository";
import type { ManifestRepository } from "./ports/ManifestRepository";

export class ExtractManifestUseCase {
  constructor(
    private readonly sourceRepository: SourceRepository,
    private readonly manifestRepository: ManifestRepository,
  ) {}

  async execute(processId: string): Promise<TranslationManifest> {
    const record = await this.sourceRepository.load(processId);
    const manifest = TranslationManifest.create({
      processId: record.processId,
      sourceLanguage: "en",
      extractedAt: new Date(),
      fields: record.fields,
    });
    await this.manifestRepository.save(manifest);
    return manifest;
  }
}
