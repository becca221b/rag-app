import { Injectable } from '@nestjs/common';

export interface Chunk {
  content: string;
  index: number;
}

@Injectable()
export class ChunkingService {
  private readonly CHUNK_SIZE = 500;
  private readonly CHUNK_OVERLAP = 50;

  chunkText(text: string): Chunk[] {
    const chunks: Chunk[] = [];
    const sentences = this.splitIntoSentences(text);
    
    let currentChunk = '';
    let chunkIndex = 0;

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > this.CHUNK_SIZE) {
        if (currentChunk.length > 0) {
          chunks.push({
            content: currentChunk.trim(),
            index: chunkIndex++,
          });
          currentChunk = '';
        }
      }
      currentChunk += sentence + ' ';
    }

    if (currentChunk.trim().length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        index: chunkIndex,
      });
    }

    return this.addOverlap(chunks);
  }

  private splitIntoSentences(text: string): string[] {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    return sentences.map((s) => s.trim()).filter((s) => s.length > 0);
  }

  private addOverlap(chunks: Chunk[]): Chunk[] {
    const overlappedChunks: Chunk[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      let content = chunks[i].content;
      
      if (i > 0) {
        const previousChunk = chunks[i - 1].content;
        const overlapText = previousChunk.slice(-this.CHUNK_OVERLAP);
        content = overlapText + ' ' + content;
      }
      
      overlappedChunks.push({
        content: content.trim(),
        index: i,
      });
    }
    
    return overlappedChunks;
  }
}
