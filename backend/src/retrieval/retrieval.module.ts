import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RetrievalService } from './retrieval.service';
import { EmbeddingsModule } from '../embeddings/embeddings.module';

@Module({
  imports: [ConfigModule, EmbeddingsModule],
  providers: [RetrievalService],
  exports: [RetrievalService],
})
export class RetrievalModule {}
