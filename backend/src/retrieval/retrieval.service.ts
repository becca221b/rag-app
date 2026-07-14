import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { Client } from '@opensearch-project/opensearch';

@Injectable()
export class RetrievalService {
  private readonly client: Client;
  private readonly indexName = 'document-chunks';

  constructor(
    private configService: ConfigService,
    private embeddingsService: EmbeddingsService,
  ) {
    const endpoint = this.configService.get<string>('aws.opensearch.endpoint') || '';
    const username = this.configService.get<string>('aws.opensearch.username') || '';
    const password = this.configService.get<string>('aws.opensearch.password') || '';

    this.client = new Client({
      node: endpoint,
      auth: {
        username,
        password,
      },
    });
  }

  async retrieveRelevantChunks(query: string, k: number = 5): Promise<any[]> {
    const embedding = await this.embeddingsService.generateEmbedding(query);

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
  }
}
