import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { RetrievalModule } from '../retrieval/retrieval.module';
import { GenerationModule } from '../generation/generation.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [RetrievalModule, GenerationModule, DatabaseModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
