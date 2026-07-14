import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenSearchService } from './opensearch.service';
import { OPENSEARCH_CLIENT } from './opensearch.types';

describe('OpenSearchService', () => {
  let service: OpenSearchService;
  let client: {
    indices: {
      create: jest.Mock;
    };
    index: jest.Mock;
    delete: jest.Mock;
    search: jest.Mock;
  };

  beforeEach(async () => {
    client = {
      indices: {
        create: jest.fn().mockResolvedValue({ statusCode: 200 }),
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
      content: 'hello world',
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
        }),
      }),
    );
  });
});
