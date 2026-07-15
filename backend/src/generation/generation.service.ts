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
  private readonly modelId = 'anthropic.claude-3-sonnet-20240229-v1:0';

  constructor(
    @Inject(BEDROCK_RUNTIME_CLIENT) private readonly bedrockClient: BedrockRuntimeClient,
    private readonly configService: ConfigService,
  ) {}

  async generateResponse(query: string, context: string[]): Promise<string> {
    const contextText = context.join('\n\n');

    const prompt = `You are a professional assistant grounded exclusively in the provided context.

Rules:
1. Answer only using the context provided below.
2. Do not invent, assume, or add facts that are not supported by the context.
3. If the answer cannot be found in the context, say clearly: "No answer found in the provided context."
4. When possible, include the source reference in this format at the end:
   - Documento: <document>
   - Página: <page>
   - Chunk: <chunk>
5. Keep the answer concise, factual, and professional.

Context:
${contextText}

Question: ${query}

Answer:`;

    const command = new InvokeModelCommand({
      modelId: this.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    const response = await this.bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    return responseBody.content[0].text;
  }
}
