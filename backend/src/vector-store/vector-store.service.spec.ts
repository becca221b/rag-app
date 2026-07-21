import { describe, expect, it, jest } from '@jest/globals';
import { VectorStoreService } from './vector-store.service';

describe('VectorStoreService', () => {
  it('saves a document embedding and exposes search results', async () => {
    const client = {
      indices: {
        exists: jest.fn<() => Promise<{ body: boolean }>>().mockResolvedValue({ body: false }),
        create: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
      },
      index: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
      search: jest.fn<() => Promise<{ body: { hits: { hits: Array<{ _id: string; _score: number; _source: { content: string; documentId: string; chunkIndex: number; metadata: { source: string } } }> } } }>>().mockResolvedValue({
        body: {
          hits: {
            hits: [
              {
                _id: 'chunk-1',
                _score: 0.92,
                _source: {
                  content: 'hello world',
                  documentId: 'doc-1',
                  chunkIndex: 0,
                  metadata: { source: 'pdf' },
                },
              },
            ],
          },
        },
      }),
    };

    const service = new VectorStoreService(client as any, {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'opensearch.index') return 'document-chunks';
        if (key === 'embeddings.dimension') return 1536;
        return '';
      }),
    } as any);

    await service.ensureIndex();
    await service.saveEmbedding({
      id: 'chunk-1',
      content: 'hello world',
      documentId: 'doc-1',
      userId: 'user-1',
      chunkIndex: 0,
      embedding: [0.1, 0.2, 0.3],
      metadata: { source: 'pdf' },
    });

    const results = await service.searchSimilarEmbeddings([0.1, 0.2, 0.3], 3);

    expect(client.index).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ userId: 'user-1' }),
      }),
    );

    expect(results[0]).toEqual(
      expect.objectContaining({
        id: 'chunk-1',
        content: 'hello world',
      }),
    );
  });
});
