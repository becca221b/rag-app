import { Inject, Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@opensearch-project/opensearch';
import { OPENSEARCH_CLIENT, IndexChunkPayload, OpenSearchSearchHit, OpenSearchQuery, OpenSearchHitItem } from './opensearch.types';

@Injectable()
export class OpenSearchService {
  private readonly logger = new Logger(OpenSearchService.name);
  private readonly indexName: string;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  constructor(
    @Inject(OPENSEARCH_CLIENT) private readonly client: Client,
    private readonly configService: ConfigService,
  ) {
    this.indexName = this.configService.getOrThrow<string>('opensearch.index');
    this.maxRetries = this.configService.get<number>('opensearch.maxRetries') || 3;
    this.retryDelay = this.configService.get<number>('opensearch.retryDelay') || 1000;
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
    return this.withRetry(async () => {
      await this.client.index({
        index: this.indexName,
        id: payload.id,
        body: {
          content: payload.content,
          chunkIndex: payload.chunkIndex,
          documentId: payload.documentId,
          userId: payload.userId,
          embedding: payload.embedding,
        },
      });

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
      }

      const response = await this.client.search({
        index: this.indexName,
        body: query,
      });

      const hits = response.body?.hits?.hits ?? [];
      return hits.map((hit: unknown) => {
        const item = hit as OpenSearchHitItem;
        return {
          id: item._id,
          content: item._source?.content,
          chunkIndex: item._source?.chunkIndex,
          documentId: item._source?.documentId,
          userId: item._source?.userId,
          score: item._score,
        };
      });
    }, 'searchSimilarChunks');
  }
}
