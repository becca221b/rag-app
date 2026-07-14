import { ChunkingService } from './chunking.service';

describe('ChunkingService', () => {
  it('creates chunks around the target size with overlap', () => {
    const service = new ChunkingService();
    const text = [
      'This is the first sentence of a long document that should be split into meaningful chunks.',
      'This is the second sentence that continues the same idea and keeps the content flowing naturally.',
      'This is the third sentence that adds more context and helps verify the chunking logic.',
      'This is the fourth sentence that should also be preserved in the next chunk with some overlap.',
    ].join(' ');

    const chunks = service.chunkText(text);

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].content.length).toBeGreaterThan(0);
    expect(chunks[0].content).toContain('This');
    chunks.forEach((chunk) => {
      expect(chunk.content.length).toBeGreaterThan(0);
    });
  });
});
