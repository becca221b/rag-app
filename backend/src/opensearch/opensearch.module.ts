import { Module } from '@nestjs/common';
import { OpenSearchService } from './opensearch.service';
import { AwsModule } from '../aws/aws.module';

@Module({
  imports: [AwsModule],
  providers: [OpenSearchService],
  exports: [OpenSearchService],
})
export class OpenSearchModule {}
