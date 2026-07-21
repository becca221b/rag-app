import { BadRequestException } from '@nestjs/common';
import { UploadService } from './upload.service';

describe('UploadService', () => {
  it('rejects non-PDF files before uploading to S3', async () => {
    const prisma = { document: { create: jest.fn() } };
    const s3Service = { uploadFile: jest.fn(), generateKey: jest.fn() };
    const configService = { get: jest.fn().mockReturnValue('bucket-test') };
    const documentIndexerService = { indexDocument: jest.fn() };

    const service = new UploadService(
      prisma as any,
      s3Service as any,
      configService as any,
      documentIndexerService as any,
    );

    await expect(
      service.uploadPdfFiles('user-1', [
        {
          originalname: 'notes.txt',
          mimetype: 'text/plain',
          size: 12,
          buffer: Buffer.from('hello'),
        } as Express.Multer.File,
      ]),
    ).rejects.toThrow(BadRequestException);

    expect(s3Service.uploadFile).not.toHaveBeenCalled();
  });

  it('starts indexing after persisting each uploaded document and returns document items', async () => {
    const document = {
      id: 'doc-1',
      filename: 'handbook.pdf',
      originalName: 'handbook.pdf',
      mimeType: 'application/pdf',
      size: 42,
      status: 'UPLOADED',
      createdAt: new Date('2026-07-21T00:00:00.000Z'),
      indexedAt: null,
    };
    const prisma = { document: { create: jest.fn(async () => document) } };
    const s3Service = {
      uploadFile: jest.fn(),
      generateKey: jest.fn(() => 'documents/user-1/handbook.pdf'),
    };
    const configService = { get: jest.fn().mockReturnValue('bucket-test') };
    const documentIndexerService = { indexDocument: jest.fn(async () => undefined) };
    const service = new UploadService(
      prisma as any,
      s3Service as any,
      configService as any,
      documentIndexerService as any,
    );

    const result = await service.uploadPdfFiles('user-1', [
      {
        originalname: 'handbook.pdf',
        mimetype: 'application/pdf',
        size: 42,
        buffer: Buffer.from('%PDF-1.7'),
      } as Express.Multer.File,
    ]);

    expect(result).toEqual([document]);
    expect(documentIndexerService.indexDocument).toHaveBeenCalledWith('doc-1');
  });
});
