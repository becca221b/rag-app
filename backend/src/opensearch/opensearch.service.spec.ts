import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenSearchService } from './opensearch.service';
import { OPENSEARCH_CLIENT } from './opensearch.types';

describe('OpenSearchService', () => {
  let service: OpenSearchService;
  let client: {
    indices: {
      exists: jest.Mock;
      create: jest.Mock;
      putMapping: jest.Mock;
    };
    index: jest.Mock;
    delete: jest.Mock;
    search: jest.Mock;
  };

  beforeEach(async () => {
    client = {
      indices: {
        exists: jest.fn().mockResolvedValue({ body: true }),
        create: jest.fn().mockResolvedValue({ statusCode: 200 }),
        putMapping: jest.fn().mockResolvedValue({ statusCode: 200 }),
      },
      index: jest.fn().mockResolvedValue({ statusCode: 200 }),
      delete: jest.fn().mockResolvedValue({ statusCode: 200 }),
      search: jest.fn().mockResolvedValue({
        body: {
          hits: {
            hits: [
              {
                _id: 'chunk-1',
                _score: 0.95,
                _source: {
                  content: 'hello world',
                  chunkIndex: 0,
                  documentId: 'doc-1',
                },
              },
            ],
          },
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenSearchService,
        {
          provide: OPENSEARCH_CLIENT,
          useValue: client,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'embeddings.dimension') return 1536;
              return undefined;
            }),
            getOrThrow: jest.fn((key: string) => {
              if (key === 'opensearch.index') {
                return 'document-chunks';
              }
              if (key === 'opensearch.node') {
                return 'http://localhost:9200';
              }
              if (key === 'opensearch.username') {
                return 'admin';
              }
              if (key === 'opensearch.password') {
                return 'admin';
              }
              return '';
            }),
          },
        },
      ],
    }).compile();

    service = module.get(OpenSearchService);
  });

  it('indexes a chunk in the configured index', async () => {
    await service.indexChunk({
      id: 'chunk-1',
      documentId: 'doc-1',
      userId: 'user-1',
      content: 'hello world',
      sourceFilename: 'handbook.pdf',
      chunkIndex: 0,
      embedding: [0.1, 0.2, 0.3],
    });

    expect(client.index).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'document-chunks',
        id: 'chunk-1',
        body: expect.objectContaining({
          content: 'hello world',
          documentId: 'doc-1',
          userId: 'user-1',
          sourceFilename: 'handbook.pdf',
        }),
      }),
    );
  });

  it('ensures user isolation mapping exists for an existing index', async () => {
    await service.onModuleInit();

    expect(client.indices.putMapping).toHaveBeenCalledWith({
      index: 'document-chunks',
      body: {
        properties: {
          userId: { type: 'keyword' },
          sourceFilename: { type: 'keyword' },
          pageNumber: { type: 'integer' },
        },
      },
    });
  });
});
