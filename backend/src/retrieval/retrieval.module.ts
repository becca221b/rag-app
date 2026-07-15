import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RetrievalService, SearchService } from './retrieval.service';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { OpenSearchModule } from '../opensearch/opensearch.module';

@Module({
  imports: [ConfigModule, EmbeddingsModule, OpenSearchModule],
  providers: [RetrievalService, SearchService],
  exports: [RetrievalService, SearchService],
})
export class RetrievalModule {}
