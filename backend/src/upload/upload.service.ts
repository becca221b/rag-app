import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { S3Service } from '../storage/s3.service';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
  ) {}

  async uploadPdfFiles(userId: string, files: Express.Multer.File[]) {
    this.validateFiles(files);

    const results = [] as Array<{
      id: string;
      filename: string;
      size: number;
      bucket: string;
      key: string;
      status: DocumentStatus;
      createdAt: Date;
    }>;

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
          size: document.size,
          bucket,
          key,
          status: document.status,
          createdAt: document.createdAt,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to upload file ${file.originalname}`, message);
        throw new InternalServerErrorException(
          `Unable to upload file ${file.originalname}`,
        );
      }
    }

    return {
      uploaded: results.length,
      files: results,
    };
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
