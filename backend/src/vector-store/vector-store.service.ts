import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@opensearch-project/opensearch';
import { Inject } from '@nestjs/common';
import { OPENSEARCH_CLIENT } from '../opensearch/opensearch.types';

export interface VectorDocument {
  id: string;
  content: string;
  documentId: string;
  chunkIndex: number;
  embedding: number[];
  metadata?: Record<string, unknown>;
}

@Injectable()
export class VectorStoreService implements OnModuleInit {
  private readonly logger = new Logger(VectorStoreService.name);
  private readonly indexName: string;
  private readonly embeddingDimension: number;

  constructor(
    @Inject(OPENSEARCH_CLIENT) private readonly client: Client,
    private readonly configService: ConfigService,
  ) {
    this.indexName = this.configService.getOrThrow<string>('opensearch.index');
    const configuredDimension = this.configService.get
      ? this.configService.get<number>('embeddings.dimension')
      : undefined;
    this.embeddingDimension = Number(configuredDimension ?? 1536);
  }

  async onModuleInit() {
    await this.ensureIndex();
  }

  async ensureIndex(): Promise<void> {
    try {
      const exists = await this.client.indices.exists({ index: this.indexName });

      if (exists.body) {
        this.logger.log(`Index ${this.indexName} already exists`);
        return;
      }

      await this.client.indices.create({
        index: this.indexName,
        body: {
          settings: {
            index: {
              knn: true,
              'knn.algo_param.ef_search': 100,
            },
          },
          mappings: {
            properties: {
              content: { type: 'text' },
              documentId: { type: 'keyword' },
              chunkIndex: { type: 'integer' },
              embedding: {
                type: 'knn_vector',
                dimension: this.embeddingDimension,
                method: {
                  name: 'hnsw',
                  space_type: 'cosinesimil',
                  engine: 'nmslib',
                  parameters: {
                    ef_construction: 100,
                    m: 16,
                  },
                },
              },
              metadata: {
                type: 'object',
                properties: {
                  source: { type: 'keyword' },
                  createdAt: { type: 'date' },
                },
              },
            },
          },
        },
      });

      this.logger.log(`Created vector index ${this.indexName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to initialize vector index ${this.indexName}`, message);
      throw error;
    }
  }

  async saveEmbedding(document: VectorDocument): Promise<void> {
    try {
      await this.client.index({
        index: this.indexName,
        id: document.id,
        body: {
          content: document.content,
          documentId: document.documentId,
          chunkIndex: document.chunkIndex,
          embedding: document.embedding,
          metadata: document.metadata ?? {},
        },
      });

      this.logger.log(`Saved embedding for chunk ${document.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to save embedding for chunk ${document.id}`, message);
      throw new Error(`Unable to save embedding: ${message}`);
    }
  }

  async searchSimilarEmbeddings(vector: number[], topK: number): Promise<Array<Record<string, unknown>>> {
    try {
      const response = await this.client.search({
        index: this.indexName,
        body: {
          size: topK,
          query: {
            knn: {
              embedding: {
                vector,
                k: topK,
              },
            },
          },
        },
      });

      return (response.body?.hits?.hits ?? []).map((hit: any) => ({
        id: hit._id,
        score: hit._score,
        content: hit._source?.content,
        documentId: hit._source?.documentId,
        chunkIndex: hit._source?.chunkIndex,
        metadata: hit._source?.metadata,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to search similar embeddings', message);
      throw new Error(`Unable to search similar embeddings: ${message}`);
    }
  }
}
