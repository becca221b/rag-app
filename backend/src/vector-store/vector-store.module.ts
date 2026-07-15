import { Module } from '@nestjs/common';
import { VectorStoreService } from './vector-store.service';
import { OpenSearchModule } from '../opensearch/opensearch.module';

@Module({
  imports: [OpenSearchModule],
  providers: [VectorStoreService],
  exports: [VectorStoreService],
})
export class VectorStoreModule {}
