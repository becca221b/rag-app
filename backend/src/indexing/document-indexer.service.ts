import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DocumentStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { PdfService } from '../pdf/pdf.service';
import { IndexingService } from './indexing.service';

@Injectable()
export class DocumentIndexerService {
  private readonly logger = new Logger(DocumentIndexerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    private readonly indexingService: IndexingService,
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
      await this.indexingService.indexDocument(documentId, extraction.text);

      this.logger.log(`Document ${documentId} extracted and indexed successfully`);
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
