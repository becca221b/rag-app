import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { Client as OpenSearchClient } from '@opensearch-project/opensearch';
import { S3_CLIENT, BEDROCK_RUNTIME_CLIENT, OPENSEARCH_CLIENT } from './aws.constants';

@Global()
@Module({
  providers: [
    {
      provide: S3_CLIENT,
      useFactory: (configService: ConfigService) => {
        const region = configService.get<string>('aws.region') ?? 'us-east-1';
        const accessKeyId = configService.get<string>('aws.accessKeyId');
        const secretAccessKey = configService.get<string>('aws.secretAccessKey');

        return new S3Client({
          region,
          credentials: {
            accessKeyId: accessKeyId ?? '',
            secretAccessKey: secretAccessKey ?? '',
          },
        });
      },
      inject: [ConfigService],
    },
    {
      provide: BEDROCK_RUNTIME_CLIENT,
      useFactory: (configService: ConfigService) => {
        const region = configService.get<string>('aws.bedrock.region') ?? 'us-east-1';
        const accessKeyId = configService.get<string>('aws.accessKeyId');
        const secretAccessKey = configService.get<string>('aws.secretAccessKey');

        return new BedrockRuntimeClient({
          region,
          credentials: {
            accessKeyId: accessKeyId ?? '',
            secretAccessKey: secretAccessKey ?? '',
          },
        });
      },
      inject: [ConfigService],
    },
    {
      provide: OPENSEARCH_CLIENT,
      useFactory: (configService: ConfigService) => {
        const endpoint = configService.get<string>('aws.opensearch.endpoint') ?? '';
        const username = configService.get<string>('aws.opensearch.username') ?? '';
        const password = configService.get<string>('aws.opensearch.password') ?? '';

        return new OpenSearchClient({
          node: endpoint,
          auth: {
            username,
            password,
          },
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [S3_CLIENT, BEDROCK_RUNTIME_CLIENT, OPENSEARCH_CLIENT],
})
export class AwsModule {}
