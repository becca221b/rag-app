import {
  BadRequestException,
  Controller,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';
import { UploadService } from './upload.service';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadPdfFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @User('id') userId: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one PDF file is required');
    }

    return this.uploadService.uploadPdfFiles(userId, files);
  }
}
