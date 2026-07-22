import { Injectable, Logger } from '@nestjs/common';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { OpenSearchService } from '../opensearch/opensearch.service';

export interface RetrievedChunk {
  id: string;
  content: string;
  chunkIndex: number;
  documentId: string;
  userId: string;
  sourceFilename?: string;
  pageNumber?: number;
  score?: number;
}

@Injectable()
export class RetrievalService {
  private readonly logger = new Logger(RetrievalService.name);

  constructor(
    private readonly embeddingsService: EmbeddingsService,
    private readonly openSearchService: OpenSearchService,
  ) {}

  async retrieveRelevantChunks(query: string, userId: string, k: number = 5): Promise<RetrievedChunk[]> {
    const embedding = await this.embeddingsService.generateEmbedding(query);
    const hits = await this.openSearchService.searchSimilarChunks(embedding, k, userId);

    const sorted = [...hits].sort((left, right) => {
      const leftScore = left.score ?? 0;
      const rightScore = right.score ?? 0;
      return rightScore - leftScore;
    });

    this.logger.log(`Retrieved ${sorted.length} chunks for query`);

    return sorted.map((hit) => ({
      id: hit.id,
      content: hit.content,
      chunkIndex: hit.chunkIndex,
      documentId: hit.documentId,
      userId: hit.userId,
      sourceFilename: hit.sourceFilename,
      pageNumber: hit.pageNumber,
      score: hit.score,
    }));
  }

  async buildContext(query: string, userId: string, k: number = 5): Promise<string> {
    const relevantChunks = await this.retrieveRelevantChunks(query, userId, k);

    if (relevantChunks.length === 0) {
      return 'No relevant context found.';
    }

    return relevantChunks
      .map((chunk, index) => `Context ${index + 1}: ${chunk.content}`)
      .join('\n\n');
  }
}

@Injectable()
export class SearchService extends RetrievalService {}
