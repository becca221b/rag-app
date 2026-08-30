import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { BEDROCK_RUNTIME_CLIENT } from '../aws/aws.constants';

export interface ContextChunk {
  content: string;
  documentId?: string;
  chunkIndex?: number;
  pageNumber?: number;
  score?: number;
}

interface DeepSeekResponse {
  choices?: Array<{
    text?: string;
    message?: {
      content?: string;
    };
  }>;
}

@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);

  constructor(
    @Inject(BEDROCK_RUNTIME_CLIENT)
    private readonly bedrockClient: BedrockRuntimeClient,
    private readonly configService: ConfigService,
  ) {}

  async generateResponse(
    query: string,
    context: string[],
  ): Promise<string> {
    const contextText = context.join('\n\n');

    const systemPrompt =
      this.configService.get<string>('rag.systemPrompt') ||
      'You are an AI assistant that answers questions using only the provided context.';

    const modelId =
      this.configService.get<string>('aws.bedrock.modelId') ||
      'deepseek.v3.2';

    const maxTokens =
      this.configService.get<number>('aws.bedrock.maxTokens') ||
      1000;

    const prompt = `${systemPrompt}

Use ONLY the information contained in the context below.

If the answer cannot be found in the context, say that the information is not available in the provided documents.

Do not invent information or use external knowledge.

Context:
${contextText}

Question:
${query}

Answer:`;

    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: maxTokens,
      }),
    });

    const response = await this.bedrockClient.send(command);

    const rawResponse = new TextDecoder().decode(response.body);

    this.logger.debug(
      `Bedrock raw response: ${rawResponse}`,
    );

    const responseBody =
      JSON.parse(rawResponse) as DeepSeekResponse;

    const text =
      responseBody.choices?.[0]?.message?.content ??
      responseBody.choices?.[0]?.text ??
      '';

    if (!text.trim()) {
      throw new Error(
        `Bedrock response has no content. Response: ${rawResponse}`,
      );
    }

    return text.trim();
  }
}