import { Injectable } from '@nestjs/common';

export interface Chunk {
  content: string;
  index: number;
  position: number;
  pageNumber?: number;
}

@Injectable()
export class ChunkingService {
  private readonly CHUNK_SIZE = 800;
  private readonly CHUNK_OVERLAP = 150;

  chunkText(text: string, pageNumber?: number): Chunk[] {
    const normalizedText = this.normalizeText(text);
    const sentences = this.splitIntoSentences(normalizedText);

    const chunks: Chunk[] = [];
    let currentChunk = '';
    let chunkIndex = 0;
    let position = 0;

    for (const sentence of sentences) {
      const candidate = currentChunk ? `${currentChunk} ${sentence}` : sentence;

      if (candidate.length > this.CHUNK_SIZE && currentChunk.length > 0) {
        chunks.push(this.buildChunk(currentChunk.trim(), chunkIndex++, position, pageNumber));
        position += currentChunk.length;
        currentChunk = sentence;
        continue;
      }

      currentChunk = candidate;
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(this.buildChunk(currentChunk.trim(), chunkIndex, position, pageNumber));
    }

    return this.addOverlap(chunks);
  }

  private buildChunk(content: string, index: number, position: number, pageNumber?: number): Chunk {
    return {
      content,
      index,
      position,
      pageNumber,
    };
  }

  private normalizeText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  private splitIntoSentences(text: string): string[] {
    const sentencePattern = /[^.!?]+[.!?]+(?:\s|$)/g;
    const matches = text.matchAll(sentencePattern);
    const sentences = Array.from(matches, (match) => match[0].trim()).filter(Boolean);

    if (sentences.length === 0) {
      return text.length > 0 ? [text] : [];
    }

    const remainder = text.replace(sentencePattern, '').trim();
    if (remainder) {
      sentences.push(remainder);
    }

    return sentences;
  }

  private addOverlap(chunks: Chunk[]): Chunk[] {
    if (chunks.length <= 1) {
      return chunks;
    }

    return chunks.map((chunk, index) => {
      if (index === 0) {
        return chunk;
      }

      const previousChunk = chunks[index - 1].content;
      const overlapContent = previousChunk.slice(-this.CHUNK_OVERLAP).trim();
      const combinedContent = overlapContent ? `${overlapContent} ${chunk.content}` : chunk.content;

      return {
        ...chunk,
        content: combinedContent.trim(),
        position: chunk.position - this.CHUNK_OVERLAP,
      };
    });
  }
}
