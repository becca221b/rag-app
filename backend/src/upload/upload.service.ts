import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { DocumentIndexerService } from '../indexing/document-indexer.service';
import { S3Service } from '../storage/s3.service';

export interface UploadedDocumentResponse {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: DocumentStatus;
  createdAt: Date;
  indexedAt: Date | null;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
    private readonly documentIndexerService: DocumentIndexerService,
  ) {}

  async uploadPdfFiles(
    userId: string,
    files: Express.Multer.File[],
  ): Promise<UploadedDocumentResponse[]> {
    this.validateFiles(files);

    const results: UploadedDocumentResponse[] = [];

    const bucket = this.configService.get<string>('aws.s3.bucket') ?? '';

    for (const file of files) {
      try {
        const key = this.s3Service.generateKey(userId, file.originalname);
        await this.s3Service.uploadFile(key, file.buffer, file.mimetype);

        const document = await this.prisma.document.create({
          data: {
            userId,
            filename: file.originalname,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            s3Key: key,
            s3Url: `s3://${bucket}/${key}`,
            status: DocumentStatus.UPLOADED,
          },
        });

        results.push({
          id: document.id,
          filename: document.filename,
          originalName: document.originalName,
          mimeType: document.mimeType,
          size: document.size,
          status: document.status,
          createdAt: document.createdAt,
          indexedAt: document.indexedAt,
        });

        this.startIndexing(document.id, document.filename);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to upload file ${file.originalname}`, message);
        throw new InternalServerErrorException(
          `Unable to upload file ${file.originalname}`,
        );
      }
    }

    return results;
  }

  private startIndexing(documentId: string, filename: string): void {
    void this.documentIndexerService.indexDocument(documentId).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Background indexing failed for ${filename} (${documentId})`, message);
    });
  }

  private validateFiles(files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one PDF file is required');
    }

    for (const file of files) {
      if (!file || !file.buffer || file.buffer.length === 0) {
        throw new BadRequestException(`File ${file?.originalname ?? 'unknown'} is empty`);
      }

      if (!this.isPdfFile(file)) {
        throw new BadRequestException(`Only PDF files are allowed: ${file.originalname}`);
      }
    }
  }

  private isPdfFile(file: Express.Multer.File): boolean {
    const name = file.originalname?.toLowerCase() ?? '';
    const mimeType = file.mimetype?.toLowerCase() ?? '';

    return name.endsWith('.pdf') || mimeType === 'application/pdf';
  }
}
