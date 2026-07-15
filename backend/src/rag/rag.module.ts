import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { RetrievalModule } from '../retrieval/retrieval.module';
import { GenerationModule } from '../generation/generation.module';

@Module({
  imports: [EmbeddingsModule, RetrievalModule, GenerationModule],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
