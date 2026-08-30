import {
  BadRequestException,
  Controller,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  Logger,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';
import { UploadService } from './upload.service';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadPdfFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @User('id') userId: string,
  ) {
    this.logger.log(`[uploadPdfFiles] Received upload request - UserID: ${userId}, Files count: ${files?.length || 0}`);

    if (!files || files.length === 0) {
      this.logger.warn(`[uploadPdfFiles] No files provided`);
      throw new BadRequestException('At least one PDF file is required');
    }

    this.logger.log(`[uploadPdfFiles] Files: ${files.map(f => f.originalname).join(', ')}`);
    this.logger.log(`[uploadPdfFiles] Calling uploadService.uploadPdfFiles()`);

    return this.uploadService.uploadPdfFiles(userId, files);
  }
}
