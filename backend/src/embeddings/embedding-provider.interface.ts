export const EMBEDDING_PROVIDER = 'EMBEDDING_PROVIDER';

export interface EmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddingsBatch(texts: string[]): Promise<number[][]>;
}
