import { describe, expect, it, jest } from '@jest/globals';
import { RagService } from './rag.service';

describe('RagService', () => {
  it('orchestrates embedding, retrieval, and generation', async () => {
    const embeddingsService = {
      generateEmbedding: jest.fn(async () => [0.1, 0.2, 0.3]),
    };

    const retrievalService = {
      retrieveRelevantChunks: jest.fn(async () => [
        {
          id: 'chunk-1',
          content: 'Relevant context',
          documentId: 'doc-1',
          chunkIndex: 0,
          score: 0.99,
        },
      ]),
    };

    const generationService = {
      generateResponse: jest.fn(async () => 'Answer from context'),
    };

    const service = new RagService(
      embeddingsService as any,
      retrievalService as any,
      generationService as any,
    );

    const result = await service.ask('What is in the document?');

    expect(embeddingsService.generateEmbedding).toHaveBeenCalledWith('What is in the document?');
    expect(retrievalService.retrieveRelevantChunks).toHaveBeenCalledWith('What is in the document?', 5);
    expect(generationService.generateResponse).toHaveBeenCalledWith('What is in the document?', ['Relevant context']);
    expect(result.answer).toBe('Answer from context');
    expect(result.sources[0].documentId).toBe('doc-1');
  });
});
