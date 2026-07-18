import { Injectable, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Inject } from '@nestjs/common';
import { S3_CLIENT } from '../aws/aws.constants';
import { ConfigService } from '@nestjs/config';

const { PDFParse } = require('pdf-parse');

export interface PdfExtractionResult {
  text: string;
  pageCount: number;
  filename: string;
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(
    @Inject(S3_CLIENT) private readonly s3Client: S3Client,
    private readonly configService: ConfigService,
  ) {}

  async extractTextFromS3(key: string, filename: string): Promise<PdfExtractionResult> {
    const bucket = this.configService.get<string>('aws.s3.bucket');

    if (!bucket) {
      throw new NotFoundException('AWS S3 bucket is not configured');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      const body = response.Body;

      if (!body) {
        throw new InternalServerErrorException('S3 object body is empty');
      }

      const pdfBuffer = Buffer.isBuffer(body)
        ? body
        : Buffer.from(await body.transformToByteArray());

      const parser = new PDFParse();
      const parsedPdf = await parser.parse(pdfBuffer);

      return {
        text: parsedPdf.text ?? '',
        pageCount: parsedPdf.numpages ?? 0,
        filename,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to extract PDF content for ${filename}`, message);

      return {
        text: '',
        pageCount: 0,
        filename,
      };
    }
  }
}
