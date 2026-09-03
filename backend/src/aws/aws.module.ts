import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { Client as OpenSearchClient } from '@opensearch-project/opensearch';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';

import {
  S3_CLIENT,
  BEDROCK_RUNTIME_CLIENT,
  OPENSEARCH_CLIENT,
} from './aws.constants';

@Global()
@Module({
  providers: [
    {
      provide: S3_CLIENT,
      useFactory: (configService: ConfigService) => {
        const region =
          configService.getOrThrow<string>('aws.region');

        const accessKeyId =
          configService.get<string>('aws.accessKeyId');

        const secretAccessKey =
          configService.get<string>('aws.secretAccessKey');

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
        const region =
          configService.getOrThrow<string>(
            'aws.bedrock.region',
          );

        const accessKeyId =
          configService.get<string>('aws.accessKeyId');

        const secretAccessKey =
          configService.get<string>('aws.secretAccessKey');

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
        const node =
          configService.getOrThrow<string>(
            'aws.opensearch.node',
          );

        const region =
          configService.getOrThrow<string>(
            'aws.region',
          );

        const accessKeyId =
          configService.get<string>(
            'aws.accessKeyId',
          );

        const secretAccessKey =
          configService.get<string>(
            'aws.secretAccessKey',
          );

        return new OpenSearchClient({
          node,

          ...AwsSigv4Signer({
            region,
            service: 'aoss',

            ...(accessKeyId && secretAccessKey
              ? {
                  getCredentials: async () => ({
                    accessKeyId,
                    secretAccessKey,
                  }),
                }
              : {
                  getCredentials:
                    defaultProvider(),
                }),
          }),
        });
      },
      inject: [ConfigService],
    },
  ],

  exports: [
    S3_CLIENT,
    BEDROCK_RUNTIME_CLIENT,
    OPENSEARCH_CLIENT,
  ],
})
export class AwsModule {}
