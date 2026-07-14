import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@opensearch-project/opensearch';
import { OPENSEARCH_CLIENT } from '../aws/aws.constants';

export interface ChunkData {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  embedding: number[];
}

@Injectable()
export class OpenSearchService {
  private readonly indexName = 'document-chunks';
  private readonly logger = new Logger(OpenSearchService.name);

  constructor(
    @Inject(OPENSEARCH_CLIENT) private readonly client: Client,
    private configService: ConfigService,
  ) {
    this.initializeIndex();
  }

  private async initializeIndex() {
    try {
      const indexExists = await this.client.indices.exists({ index: this.indexName });

      if (!indexExists) {
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
                chunkIndex: { type: 'integer' },
                documentId: { type: 'keyword' },
                embedding: {
                  type: 'knn_vector',
                  dimension: 1536,
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
              },
            },
          },
        });
        this.logger.log(`Created index: ${this.indexName}`);
      }
    } catch (error: any) {
      this.logger.error(`Error initializing index: ${error.message}`);
    }
  }

  async indexChunk(chunkData: ChunkData) {
    try {
      await this.client.index({
        index: this.indexName,
        id: chunkData.id,
        body: {
          content: chunkData.content,
          chunkIndex: chunkData.chunkIndex,
          documentId: chunkData.documentId,
          embedding: chunkData.embedding,
        },
      });
    } catch (error: any) {
      this.logger.error(`Error indexing chunk ${chunkData.id}: ${error.message}`);
      throw error;
    }
  }

  async searchChunks(embedding: number[], k: number = 5): Promise<any[]> {
    try {
      const response = await this.client.search({
        index: this.indexName,
        body: {
          size: k,
          query: {
            knn: {
              embedding: {
                vector: embedding,
                k: k,
              },
            },
          },
        },
      });

      return response.body.hits.hits.map((hit: any) => ({
        id: hit._id,
        content: hit._source.content,
        chunkIndex: hit._source.chunkIndex,
        documentId: hit._source.documentId,
        score: hit._score,
      }));
    } catch (error: any) {
      this.logger.error(`Error searching chunks: ${error.message}`);
      throw error;
    }
  }

  async deleteChunk(chunkId: string) {
    try {
      await this.client.delete({
        index: this.indexName,
        id: chunkId,
      });
    } catch (error: any) {
      this.logger.error(`Error deleting chunk ${chunkId}: ${error.message}`);
      throw error;
    }
  }

  async deleteDocumentChunks(documentId: string) {
    try {
      await this.client.deleteByQuery({
        index: this.indexName,
        body: {
          query: {
            term: {
              documentId,
            },
          },
        },
      });
    } catch (error: any) {
      this.logger.error(`Error deleting chunks for document ${documentId}: ${error.message}`);
      throw error;
    }
  }
}
