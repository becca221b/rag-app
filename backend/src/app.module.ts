import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { StorageModule } from './storage/storage.module';
import { DocumentsModule } from './documents/documents.module';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { UploadModule } from './upload/upload.module';
import { PdfModule } from './pdf/pdf.module';
import { ChunkingModule } from './chunking/chunking.module';
import { IndexingModule } from './indexing/indexing.module';
import { RetrievalModule } from './retrieval/retrieval.module';
import { GenerationModule } from './generation/generation.module';
import { ChatModule } from './chat/chat.module';
import { AwsModule } from './aws/aws.module';
import configuration from './config/configuration';
import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      validate,
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    StorageModule,
    DocumentsModule,
    EmbeddingsModule,
    UploadModule,
    PdfModule,
    ChunkingModule,
    IndexingModule,
    RetrievalModule,
    GenerationModule,
    ChatModule,
    AwsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
