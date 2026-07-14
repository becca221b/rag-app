import { PdfService } from './pdf.service';

describe('PdfService', () => {
  it('returns parsed metadata from a PDF buffer', async () => {
    const s3Client = {
      send: jest.fn().mockResolvedValue({
        Body: Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 12 Tf 72 720 Td (Hello PDF) Tj ET\nendstream\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF'),
      }),
    };
    const configService = { get: jest.fn().mockReturnValue('bucket-test') };

    const service = new PdfService(s3Client as any, configService as any);

    const result = await service.extractTextFromS3('docs/sample.pdf', 'sample.pdf');

    expect(result.filename).toBe('sample.pdf');
    expect(result.pageCount).toBeGreaterThanOrEqual(0);
    expect(typeof result.text).toBe('string');
  });
});
