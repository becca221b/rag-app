import { Controller, Post, Get, Delete, UseGuards, Param, Body, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocumentsService } from './documents.service';
import { User } from '../common/decorators/user.decorator';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @User('id') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.documentsService.uploadDocument(userId, file);
  }

  @Get()
  async getDocuments(@User('id') userId: string) {
    return this.documentsService.getUserDocuments(userId);
  }

  @Get(':id')
  async getDocument(@Param('id') id: string, @User('id') userId: string) {
    return this.documentsService.getDocument(id, userId);
  }

  @Delete(':id')
  async deleteDocument(@Param('id') id: string, @User('id') userId: string) {
    return this.documentsService.deleteDocument(id, userId);
  }
}
