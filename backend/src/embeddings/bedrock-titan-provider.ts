import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { BEDROCK_RUNTIME_CLIENT } from '../aws/aws.constants';
import { EmbeddingProvider } from './embedding-provider.interface';

@Injectable()
export class BedrockTitanEmbeddingProvider implements EmbeddingProvider {
  private readonly modelId: string;

  constructor(
    @Inject(BEDROCK_RUNTIME_CLIENT) private readonly bedrockClient: BedrockRuntimeClient,
    private readonly configService: ConfigService,
  ) {
    this.modelId = this.configService.get<string>('aws.bedrock.embeddingModelId') ?? 'amazon.titan-embed-text-v1';
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.bedrockClient.send(
      new InvokeModelCommand({
        modelId: this.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({ inputText: text }),
      }),
    );

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    return responseBody.embedding;
  }

  async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((text) => this.generateEmbedding(text)));
  }
}
