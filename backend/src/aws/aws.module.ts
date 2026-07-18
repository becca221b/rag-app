import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { Client as OpenSearchClient } from '@opensearch-project/opensearch';
import { S3_CLIENT, BEDROCK_RUNTIME_CLIENT, OPENSEARCH_CLIENT } from './aws.constants';

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() !== 'false';
  return fallback;
}

@Global()
@Module({
  providers: [
    {
      provide: S3_CLIENT,
      useFactory: (configService: ConfigService) => {
        const region = configService.getOrThrow<string>('aws.region');
        const accessKeyId = configService.get<string>('aws.accessKeyId');
        const secretAccessKey = configService.get<string>('aws.secretAccessKey');

        return new S3Client({
          region,
          ...(accessKeyId && secretAccessKey
            ? {
                credentials: {
                  accessKeyId,
                  secretAccessKey,
                },
              }
            : {}),
        });
      },
      inject: [ConfigService],
    },
    {
      provide: BEDROCK_RUNTIME_CLIENT,
      useFactory: (configService: ConfigService) => {
        const region = configService.getOrThrow<string>('aws.bedrock.region');
        const accessKeyId = configService.get<string>('aws.accessKeyId');
        const secretAccessKey = configService.get<string>('aws.secretAccessKey');

        return new BedrockRuntimeClient({
          region,
          ...(accessKeyId && secretAccessKey
            ? {
                credentials: {
                  accessKeyId,
                  secretAccessKey,
                },
              }
            : {}),
        });
      },
      inject: [ConfigService],
    },
    {
      provide: OPENSEARCH_CLIENT,
      useFactory: (configService: ConfigService) => {
        const node = configService.getOrThrow<string>('opensearch.node');
        const username = configService.getOrThrow<string>('opensearch.username');
        const password = configService.getOrThrow<string>('opensearch.password');
        const rejectUnauthorized = configService.get<boolean>('opensearch.rejectUnauthorized') ?? true;

        return new OpenSearchClient({
          node,
          auth: {
            username,
            password,
          },
          ssl: {
            rejectUnauthorized,
          },
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [S3_CLIENT, BEDROCK_RUNTIME_CLIENT, OPENSEARCH_CLIENT],
})
export class AwsModule {}
