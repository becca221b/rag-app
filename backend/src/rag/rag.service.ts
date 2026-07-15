import { Injectable, Logger } from '@nestjs/common';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { RetrievalService } from '../retrieval/retrieval.service';
import { GenerationService } from '../generation/generation.service';

export interface RagQueryResult {
  answer: string;
  context: string[];
  sources: Array<{
    id: string;
    content: string;
    documentId: string;
    chunkIndex: number;
    score?: number;
  }>;
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly embeddingsService: EmbeddingsService,
    private readonly retrievalService: RetrievalService,
    private readonly generationService: GenerationService,
  ) {}

  async ask(question: string, topK: number = 5): Promise<RagQueryResult> {
    this.logger.log(`Processing RAG question: ${question}`);

    const embedding = await this.embeddingsService.generateEmbedding(question);
    const relevantChunks = await this.retrievalService.retrieveRelevantChunks(question, topK);

    const context = relevantChunks.map((chunk) => String(chunk.content ?? ''));
    const answer = await this.generationService.generateResponse(question, context);

    return {
      answer,
      context,
      sources: relevantChunks.map((chunk) => ({
        id: String(chunk.id ?? ''),
        content: String(chunk.content ?? ''),
        documentId: String(chunk.documentId ?? ''),
        chunkIndex: Number(chunk.chunkIndex ?? 0),
        score: chunk.score,
      })),
    };
  }
}
