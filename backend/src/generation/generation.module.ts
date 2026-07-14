import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GenerationService } from './generation.service';

@Module({
  imports: [ConfigModule],
  providers: [GenerationService],
  exports: [GenerationService],
})
export class GenerationModule {}
