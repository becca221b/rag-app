import { describe, expect, it, jest } from '@jest/globals';
import { GenerationService } from './generation.service';

describe('GenerationService', () => {
  it('builds a grounded prompt and returns the model response', async () => {
    const bedrockClient = {
      send: jest.fn(async () => ({
        body: new TextEncoder().encode(JSON.stringify({
          content: [{ text: 'Answer from context' }],
        })),
      })),
    };

    const service = new GenerationService(bedrockClient as any, { get: jest.fn() } as any);

    const result = await service.generateResponse('What is this?', ['Context chunk']);

    expect(result).toBe('Answer from context');
    expect(bedrockClient.send).toHaveBeenCalled();
  });
});
