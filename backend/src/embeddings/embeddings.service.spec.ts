import { describe, expect, it, jest } from '@jest/globals';
import { EmbeddingsService } from './embeddings.service';

describe('EmbeddingsService', () => {
  it('delegates to the configured embedding provider', async () => {
    const provider = {
      generateEmbedding: jest.fn<(text: string) => Promise<number[]>>().mockResolvedValue([0.1, 0.2, 0.3]),
      generateEmbeddingsBatch: jest.fn<(texts: string[]) => Promise<number[][]>>().mockResolvedValue([[0.1, 0.2, 0.3]]),
    };

    const service = new EmbeddingsService(provider as any);

    await expect(service.generateEmbedding('hello')).resolves.toEqual([0.1, 0.2, 0.3]);
    expect(provider.generateEmbedding).toHaveBeenCalledWith('hello');
  });
});
