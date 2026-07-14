import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@opensearch-project/opensearch';
import { OPENSEARCH_CLIENT, IndexChunkPayload, OpenSearchSearchHit } from './opensearch.types';

@Injectable()
export class OpenSearchService {
  private readonly logger = new Logger(OpenSearchService.name);
  private readonly indexName: string;

  constructor(
    @Inject(OPENSEARCH_CLIENT) private readonly client: Client,
    private readonly configService: ConfigService,
  ) {
    this.indexName = this.configService.getOrThrow<string>('opensearch.index');
  }

  async indexChunk(payload: IndexChunkPayload): Promise<void> {
    try {
      await this.client.index({
        index: this.indexName,
        id: payload.id,
        body: {
          content: payload.content,
          chunkIndex: payload.chunkIndex,
          documentId: payload.documentId,
          embedding: payload.embedding,
        },
      });

      this.logger.log(`Indexed chunk ${payload.id} in index ${this.indexName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to index chunk ${payload.id}`, message);
      throw new Error(`Unable to index chunk ${payload.id}: ${message}`);
    }
  }

  async deleteChunk(id: string): Promise<void> {
    try {
      await this.client.delete({
        index: this.indexName,
        id,
      });

      this.logger.log(`Deleted chunk ${id} from index ${this.indexName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to delete chunk ${id}`, message);
      throw new Error(`Unable to delete chunk ${id}: ${message}`);
    }
  }

  async searchSimilarChunks(vector: number[], topK: number): Promise<OpenSearchSearchHit[]> {
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
        content: hit._source?.content,
        chunkIndex: hit._source?.chunkIndex,
        documentId: hit._source?.documentId,
        score: hit._score,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to search similar chunks', message);
      throw new Error(`Unable to search similar chunks: ${message}`);
    }
  }
}
