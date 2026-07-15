import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IndexingService } from './indexing.service';
import { DocumentIndexerService } from './document-indexer.service';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { ChunkingModule } from '../chunking/chunking.module';
import { DatabaseModule } from '../database/database.module';
import { OpenSearchModule } from '../opensearch/opensearch.module';
import { PdfModule } from '../pdf/pdf.module';
import { VectorStoreModule } from '../vector-store/vector-store.module';

@Module({
  imports: [
    ConfigModule,
    EmbeddingsModule,
    ChunkingModule,
    DatabaseModule,     
    OpenSearchModule,
    PdfModule,
    VectorStoreModule,
  ],
  providers: [IndexingService, DocumentIndexerService],
  exports: [IndexingService, DocumentIndexerService],
})
export class IndexingModule {}
