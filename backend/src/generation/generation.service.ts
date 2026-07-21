import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { BEDROCK_RUNTIME_CLIENT } from '../aws/aws.constants';

export interface ContextChunk {
  content: string;
  documentId?: string;
  chunkIndex?: number;
  pageNumber?: number;
  score?: number;
}

@Injectable()
export class GenerationService {
  constructor(
    @Inject(BEDROCK_RUNTIME_CLIENT) private readonly bedrockClient: BedrockRuntimeClient,
    private readonly configService: ConfigService,
  ) {}

  async generateResponse(query: string, context: string[]): Promise<string> {
    const contextText = context.join('\n\n');
    const systemPrompt = this.configService.get<string>('rag.systemPrompt') || '';
    const modelId = this.configService.get<string>('aws.bedrock.modelId') || 'anthropic.claude-3-sonnet-20240229-v1:0';
    const maxTokens = this.configService.get<number>('aws.bedrock.maxTokens') || 1000;

    const prompt = `${systemPrompt}

Context:
${contextText}

Question: ${query}

Answer:`;

    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: maxTokens,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    const response = await this.bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body)) as BedrockResponse;

    return responseBody.content[0].text;
  }
}

interface BedrockResponse {
  content: Array<{
    text: string;
  }>;
}
