import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmbeddingsService } from './embeddings.service';
import { BedrockTitanEmbeddingProvider } from './bedrock-titan-provider';
import { EMBEDDING_PROVIDER } from './embedding-provider.interface';

@Module({
  imports: [ConfigModule],
  providers: [
    BedrockTitanEmbeddingProvider,
    {
      provide: EMBEDDING_PROVIDER,
      useExisting: BedrockTitanEmbeddingProvider,
    },
    EmbeddingsService,
  ],
  exports: [EmbeddingsService],
})
export class EmbeddingsModule {}
