import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { BEDROCK_RUNTIME_CLIENT } from '../aws/aws.constants';

@Injectable()
export class EmbeddingsService {
  private readonly modelId = 'amazon.titan-embed-text-v1';

  constructor(
    @Inject(BEDROCK_RUNTIME_CLIENT) private readonly bedrockClient: BedrockRuntimeClient,
    private configService: ConfigService,
  ) {}

  async generateEmbedding(text: string): Promise<number[]> {
    const command = new InvokeModelCommand({
      modelId: this.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        inputText: text,
      }),
    });

    const response = await this.bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    return responseBody.embedding;
  }

  async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    const embeddings = await Promise.all(
      texts.map((text) => this.generateEmbedding(text)),
    );
    return embeddings;
  }
}
