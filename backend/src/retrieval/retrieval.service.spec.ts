import { describe, expect, it, jest } from '@jest/globals';
import { RetrievalService } from './retrieval.service';

describe('RetrievalService', () => {
  it('retrieves and orders the most relevant chunks for a query', async () => {
    const embeddingsService = {
      generateEmbedding: jest.fn(async () => [0.1, 0.2, 0.3]) as jest.Mock,
    };

    const openSearchService = {
      searchSimilarChunks: jest.fn(async () => [
        {
          id: 'chunk-2',
          content: 'Second chunk',
          documentId: 'doc-1',
          userId: 'user-1',
          sourceFilename: 'handbook.pdf',
          chunkIndex: 1,
          pageNumber: 3,
          score: 0.8,
        },
        {
          id: 'chunk-1',
          content: 'First chunk',
          documentId: 'doc-1',
          userId: 'user-1',
          sourceFilename: 'handbook.pdf',
          chunkIndex: 0,
          score: 0.95,
        },
      ]) as jest.Mock,
    };

    const service = new RetrievalService(
      embeddingsService as any,
      openSearchService as any,
    );

    const result = await service.retrieveRelevantChunks('What is this?', 'user-1', 5);

    expect(embeddingsService.generateEmbedding).toHaveBeenCalledWith('What is this?');
    expect(openSearchService.searchSimilarChunks).toHaveBeenCalledWith([0.1, 0.2, 0.3], 5, 'user-1');
    expect(result[0].id).toBe('chunk-1');
    expect(result[1].id).toBe('chunk-2');
    const firstScore = result[0].score ?? 0;
    const secondScore = result[1].score ?? 0;

    expect(firstScore).toBeGreaterThan(secondScore);
    expect(result[1]).toEqual(expect.objectContaining({
      sourceFilename: 'handbook.pdf',
      pageNumber: 3,
    }));
  });
});
