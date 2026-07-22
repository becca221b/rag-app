import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { ChunkingService } from '../chunking/chunking.service';
import { OpenSearchService } from '../opensearch/opensearch.service';
import { DocumentStatus } from '@prisma/client';

@Injectable()
export class IndexingService {
  private readonly logger = new Logger(IndexingService.name);

  constructor(
    private prisma: PrismaService,
    private embeddingsService: EmbeddingsService,
    private chunkingService: ChunkingService,
    private openSearchService: OpenSearchService,
  ) {}

  async indexDocument(documentId: string, text: string) {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
        select: { userId: true, filename: true },
      });

      if (!document) {
        throw new Error(`Document ${documentId} not found`);
      }

      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.INDEXING },
      });

      const chunks = this.chunkingService.chunkText(text);
      this.logger.log(`Document ${documentId} split into ${chunks.length} chunks`);

      const embeddings = await this.embeddingsService.generateEmbeddingsBatch(
        chunks.map((c) => c.content),
      );

      const chunkOperations = chunks.map(async (chunk, i) => {
        const embedding = embeddings[i];

        const savedChunk = await this.prisma.chunk.create({
          data: {
            documentId,
            content: chunk.content,
            chunkIndex: chunk.index,
          },
        });

        await this.openSearchService.indexChunk({
          id: savedChunk.id,
          documentId,
          userId: document.userId,
          content: chunk.content,
          sourceFilename: document.filename,
          chunkIndex: chunk.index,
          pageNumber: chunk.pageNumber,
          embedding,
        });

        return savedChunk;
      });

      await Promise.all(chunkOperations);

      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.INDEXED,
          indexedAt: new Date(),
        },
      });

      this.logger.log(`Document ${documentId} indexed successfully`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.error(message);

      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.ERROR,
          error: message,
        },
      });

      throw error;
    }
  }

  async deleteDocumentChunks(documentId: string) {
    const chunks = await this.prisma.chunk.findMany({
      where: { documentId },
    });

    for (const chunk of chunks) {
      await this.openSearchService.deleteChunk(chunk.id);
    }

    await this.prisma.chunk.deleteMany({
      where: { documentId },
    });
  }
}
