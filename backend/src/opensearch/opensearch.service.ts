import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@opensearch-project/opensearch';
import { OPENSEARCH_CLIENT, IndexChunkPayload, OpenSearchSearchHit, OpenSearchQuery, OpenSearchHitItem } from './opensearch.types';

@Injectable()
export class OpenSearchService implements OnModuleInit {
  private readonly logger = new Logger(OpenSearchService.name);
  private readonly indexName: string;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly embeddingDimension: number;

  constructor(
    @Inject(OPENSEARCH_CLIENT) private readonly client: Client,
    private readonly configService: ConfigService,
  ) {
    this.indexName = this.configService.getOrThrow<string>('aws.opensearch.index');
    this.maxRetries = this.configService.get<number>('aws.opensearch.maxRetries') || 3;
    this.retryDelay = this.configService.get<number>('aws.opensearch.retryDelay') || 1000;
    this.embeddingDimension = this.configService.get<number>('embeddings.dimension') || 1024;
  }

  async onModuleInit(): Promise<void> {
    await this.ensureIndex();
  }

  private async ensureIndex(): Promise<void> {
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
            userId: { type: 'keyword' },
            sourceFilename: { type: 'keyword' },
            chunkIndex: { type: 'integer' },
            pageNumber: { type: 'integer' },
            embedding: {
              type: 'knn_vector',
              dimension: this.embeddingDimension,
              method: {
                name: 'hnsw',
                space_type: 'cosinesimil',
                parameters: {
                  ef_construction: 100,
                  m: 16,
                },
              },
            },
          },
        },
      },
    });

    this.logger.log(`Created index ${this.indexName}`);
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === this.maxRetries) {
          this.logger.error(`${operationName} failed after ${this.maxRetries + 1} attempts`, lastError.message);
          throw lastError;
        }

        const delay = this.retryDelay * Math.pow(2, attempt);
        this.logger.warn(`${operationName} failed (attempt ${attempt + 1}/${this.maxRetries + 1}), retrying in ${delay}ms`);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async indexChunk(payload: IndexChunkPayload): Promise<void> {
    this.logger.log(`[indexChunk] Starting - ID: ${payload.id}, DocumentID: ${payload.documentId}, ChunkIndex: ${payload.chunkIndex}`);
    this.logger.log(`[indexChunk] Content length: ${payload.content.length}, Embedding length: ${payload.embedding.length}`);
    this.logger.log(`[indexChunk] UserID: ${payload.userId}, SourceFilename: ${payload.sourceFilename}`);

    return this.withRetry(async () => {
      this.logger.log(`[indexChunk] Calling OpenSearch client.index()`);
      const response = await this.client.index({
        index: this.indexName,
        id: payload.id,
        body: {
          content: payload.content,
          chunkIndex: payload.chunkIndex,
          documentId: payload.documentId,
          userId: payload.userId,
          sourceFilename: payload.sourceFilename,
          embedding: payload.embedding,
          ...(payload.pageNumber !== undefined ? { pageNumber: payload.pageNumber } : {}),
        },
      });

      this.logger.log(`[indexChunk] OpenSearch response: ${JSON.stringify(response.body)}`);
      this.logger.log(`Indexed chunk ${payload.id} in index ${this.indexName}`);
    }, 'indexChunk');
  }

  async deleteChunk(id: string): Promise<void> {
    return this.withRetry(async () => {
      await this.client.delete({
        index: this.indexName,
        id,
      });

      this.logger.log(`Deleted chunk ${id} from index ${this.indexName}`);
    }, 'deleteChunk');
  }

  async searchSimilarChunks(vector: number[], topK: number, userId?: string): Promise<OpenSearchSearchHit[]> {
    this.logger.log(`[searchSimilarChunks] Starting - Vector length: ${vector.length}, TopK: ${topK}, UserID: ${userId || 'none'}`);

    return this.withRetry(async () => {
      const query: OpenSearchQuery = {
        size: topK,
        query: {
          bool: {
            must: [
              {
                knn: {
                  embedding: {
                    vector,
                    k: topK,
                  },
                },
              },
            ],
          },
        },
      };

      // Filter by userId if provided for security
      if (userId) {
        query.query.bool.must.push({
          term: {
            userId,
          },
        });
        this.logger.log(`[searchSimilarChunks] Added userId filter: ${userId}`);
      }

      this.logger.log(`[searchSimilarChunks] Query: ${JSON.stringify(query)}`);

      const response = await this.client.search({
        index: this.indexName,
        body: query,
      });

      this.logger.log(`[searchSimilarChunks] OpenSearch response status: ${response.statusCode}`);
      const totalHits = response.body?.hits?.total;
      const totalHitsValue = typeof totalHits === 'number' ? totalHits : totalHits?.value || 0;
      this.logger.log(`[searchSimilarChunks] Total hits: ${totalHitsValue}`);

      const hits = response.body?.hits?.hits ?? [];
      this.logger.log(`[searchSimilarChunks] Hits array length: ${hits.length}`);

      const mappedHits = hits.map((hit: unknown) => {
        const item = hit as OpenSearchHitItem;
        return {
          id: item._id,
          content: item._source?.content,
          chunkIndex: item._source?.chunkIndex,
          documentId: item._source?.documentId,
          userId: item._source?.userId,
          sourceFilename: item._source?.sourceFilename,
          pageNumber: item._source?.pageNumber,
          score: item._score,
        };
      });

      this.logger.log(`[searchSimilarChunks] Returning ${mappedHits.length} hits`);
      return mappedHits;
    }, 'searchSimilarChunks');
  }

  async deleteIndex(): Promise<void> {
    this.logger.log(`[deleteIndex] Deleting index ${this.indexName}`);
    const exists = await this.client.indices.exists({ index: this.indexName });

    if (exists.body) {
      await this.client.indices.delete({ index: this.indexName });
      this.logger.log(`[deleteIndex] Index ${this.indexName} deleted successfully`);
    } else {
      this.logger.log(`[deleteIndex] Index ${this.indexName} does not exist`);
    }
  }
}
