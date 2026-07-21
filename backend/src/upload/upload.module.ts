import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { StorageModule } from '../storage/storage.module';
import { DatabaseModule } from '../database/database.module';
import { IndexingModule } from '../indexing/indexing.module';

@Module({
  imports: [StorageModule, DatabaseModule, IndexingModule],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
