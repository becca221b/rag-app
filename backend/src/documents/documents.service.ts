import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { S3Service } from '../storage/s3.service';
import { DocumentStatus } from '@prisma/client';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
  ) {}

  async uploadDocument(userId: string, file: Express.Multer.File) {
    const s3Key = this.s3Service.generateKey(userId, file.originalname);
    const s3Url = await this.s3Service.uploadFile(s3Key, file.buffer, file.mimetype);

    const document = await this.prisma.document.create({
      data: {
        userId,
        filename: file.originalname,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        s3Key,
        s3Url,
        status: DocumentStatus.UPLOADED,
      },
    });

    return {
      id: document.id,
      filename: document.filename,
      status: document.status,
      createdAt: document.createdAt,
    };
  }

  async getUserDocuments(userId: string) {
    return this.prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        filename: true,
        originalName: true,
        mimeType: true,
        size: true,
        status: true,
        createdAt: true,
        indexedAt: true,
      },
    });
  }

  async getDocument(id: string, userId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return document;
  }

  async deleteDocument(id: string, userId: string) {
    const document = await this.getDocument(id, userId);

    await this.s3Service.deleteFile(document.s3Key);

    await this.prisma.document.delete({
      where: { id },
    });

    return { message: 'Document deleted successfully' };
  }

  async updateDocumentStatus(id: string, status: DocumentStatus, error?: string) {
    return this.prisma.document.update({
      where: { id },
      data: {
        status,
        error,
        indexedAt: status === DocumentStatus.INDEXED ? new Date() : null,
      },
    });
  }
}
