import { describe, expect, it, jest } from '@jest/globals';
import { DocumentStatus } from '@prisma/client';
import { DocumentIndexerService } from './document-indexer.service';

describe('DocumentIndexerService', () => {
  it('extracts the PDF and delegates indexing to the application service', async () => {
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

    const indexingService = {
      indexDocument: jest.fn(async () => undefined) as jest.Mock,
    };

    const service = new DocumentIndexerService(
      prisma as any,
      pdfService as any,
      indexingService as any,
    );

    await service.indexDocument('doc-1');

    expect(pdfService.extractTextFromS3).toHaveBeenCalledWith('docs/file.pdf', 'file.pdf');
    expect(indexingService.indexDocument).toHaveBeenCalledWith('doc-1', 'hello world');
  });
});
