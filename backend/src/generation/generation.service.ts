import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { BEDROCK_RUNTIME_CLIENT } from '../aws/aws.constants';

@Injectable()
export class GenerationService {
  private readonly modelId = 'anthropic.claude-3-sonnet-20240229-v1:0';

  constructor(
    @Inject(BEDROCK_RUNTIME_CLIENT) private readonly bedrockClient: BedrockRuntimeClient,
    private configService: ConfigService,
  ) {}

  async generateResponse(query: string, context: string[]): Promise<string> {
    const contextText = context.join('\n\n');
    
    const prompt = `You are a helpful AI assistant. Use the following context to answer the user's question. If the answer is not in the context, say so.

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
