import { BadRequestException } from '@nestjs/common';
import { UploadService } from './upload.service';

describe('UploadService', () => {
  it('rejects non-PDF files before uploading to S3', async () => {
    const prisma = { document: { create: jest.fn() } };
    const s3Service = { uploadFile: jest.fn(), generateKey: jest.fn() };
    const configService = { get: jest.fn().mockReturnValue('bucket-test') };

    const service = new UploadService(prisma as any, s3Service as any, configService as any);

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
});
