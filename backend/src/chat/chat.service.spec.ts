import { describe, expect, it, jest } from '@jest/globals';
import { ChatService } from './chat.service';

describe('ChatService', () => {
  it('returns and persists traceable source citations', async () => {
    const prisma = {
      chatSession: {
        create: jest.fn(async () => ({ id: 'session-1' })),
      },
      message: {
        createMany: jest.fn(async () => ({ count: 2 })),
      },
    };
    const retrievalService = {
      retrieveRelevantChunks: jest.fn(async () => [
        {
          id: 'chunk-1',
          content: 'Employees receive 20 days of PTO.',
          documentId: 'doc-1',
          sourceFilename: 'employee-handbook.pdf',
          chunkIndex: 2,
          pageNumber: 4,
          score: 0.97,
        },
      ]),
    };
    const generationService = {
      generateResponse: jest.fn(async () => 'Full-time employees receive 20 days of PTO.'),
    };
    const service = new ChatService(
      prisma as any,
      retrievalService as any,
      generationService as any,
    );

    const result = await service.query('user-1', 'How many PTO days do employees receive?');

    expect(result.sources).toEqual([
      expect.objectContaining({
        id: 'chunk-1',
        documentId: 'doc-1',
        sourceFilename: 'employee-handbook.pdf',
        pageNumber: 4,
        chunkIndex: 2,
      }),
    ]);
    expect(prisma.message.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            sources: expect.objectContaining({
              chunks: [expect.objectContaining({ sourceFilename: 'employee-handbook.pdf' })],
            }),
          }),
        ]),
      }),
    );
  });
});
