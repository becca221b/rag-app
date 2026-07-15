import { describe, expect, it, jest } from '@jest/globals';
import { DocumentStatus } from '@prisma/client';
import { DocumentIndexerService } from './document-indexer.service';

describe('DocumentIndexerService', () => {
  it('indexes a document through pdf extraction, chunking, embeddings, and vector storage', async () => {
    const prisma = {
      document: {
        findUnique: jest.fn(async () => ({
          id: 'doc-1',
          s3Key: 'docs/file.pdf',
          filename: 'file.pdf',
          userId: 'user-1',
        })) as jest.Mock,
        update: jest.fn(async () => ({})) as jest.Mock,
      },
      chunk: {
        create: jest.fn(async () => ({ id: 'chunk-1' })) as jest.Mock,
      },
    };

    const pdfService = {
      extractTextFromS3: jest.fn(async () => ({ text: 'hello world', pageCount: 1, filename: 'file.pdf' })) as jest.Mock,
    };

    const chunkingService = {
      chunkText: jest.fn(() => [{ content: 'hello world', index: 0, position: 0 }]) as jest.Mock,
    };

    const embeddingsService = {
      generateEmbeddingsBatch: jest.fn(async () => [[0.1, 0.2, 0.3]]) as jest.Mock,
    };

    const vectorStoreService = {
      saveEmbedding: jest.fn(async () => undefined) as jest.Mock,
    };

    const service = new DocumentIndexerService(
      prisma as any,
      pdfService as any,
      chunkingService as any,
      embeddingsService as any,
      vectorStoreService as any,
    );

    await service.indexDocument('doc-1');

    expect(pdfService.extractTextFromS3).toHaveBeenCalledWith('docs/file.pdf', 'file.pdf');
    expect(chunkingService.chunkText).toHaveBeenCalledWith('hello world');
    expect(embeddingsService.generateEmbeddingsBatch).toHaveBeenCalled();
    expect(vectorStoreService.saveEmbedding).toHaveBeenCalled();
    expect(prisma.document.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: DocumentStatus.INDEXED }),
      }),
    );
  });
});
