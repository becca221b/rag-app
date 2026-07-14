import { Inject, Injectable } from '@nestjs/common';
import type { EmbeddingProvider } from './embedding-provider.interface';
import { EMBEDDING_PROVIDER } from './embedding-provider.interface';

@Injectable()
export class EmbeddingsService {
  constructor(
    @Inject(EMBEDDING_PROVIDER) private readonly embeddingProvider: EmbeddingProvider,
  ) {}

  async generateEmbedding(text: string): Promise<number[]> {
    return this.embeddingProvider.generateEmbedding(text);
  }

  async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    return this.embeddingProvider.generateEmbeddingsBatch(texts);
  }
}
