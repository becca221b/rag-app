import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IndexingService } from './indexing.service';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { ChunkingModule } from '../chunking/chunking.module';
import { DatabaseModule } from '../database/database.module';
import { OpenSearchModule } from '../opensearch/opensearch.module';

@Module({
  imports: [
    ConfigModule,
    EmbeddingsModule,
    ChunkingModule,
    DatabaseModule,
    OpenSearchModule,
  ],
  providers: [IndexingService],
  exports: [IndexingService],
})
export class IndexingModule {}
