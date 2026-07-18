import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DocumentStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { PdfService } from '../pdf/pdf.service';
import { ChunkingService } from '../chunking/chunking.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { VectorStoreService } from '../vector-store/vector-store.service';

@Injectable()
export class DocumentIndexerService {
  private readonly logger = new Logger(DocumentIndexerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    private readonly chunkingService: ChunkingService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly vectorStoreService: VectorStoreService,
  ) {}

  async indexDocument(documentId: string): Promise<void> {
    try {
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.INDEXING },
      });

      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      const extraction = await this.pdfService.extractTextFromS3(document.s3Key, document.filename);
      const chunks = this.chunkingService.chunkText(extraction.text);

      const embeddings = await this.embeddingsService.generateEmbeddingsBatch(
        chunks.map((chunk) => chunk.content),
      );

      for (let index = 0; index < chunks.length; index += 1) {
        const chunk = chunks[index];
        const embedding = embeddings[index];

        const savedChunk = await this.prisma.chunk.create({
          data: {
            documentId,
            content: chunk.content,
            chunkIndex: chunk.index,
          },
        });

        await this.vectorStoreService.saveEmbedding({
          id: savedChunk.id,
          content: chunk.content,
          documentId,
          chunkIndex: chunk.index,
          embedding,
          metadata: {
            source: document.filename,
            pageNumber: chunk.pageNumber ?? 1,
          },
        });
      }

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
      this.logger.error(`Failed to index document ${documentId}`, message);

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
}
