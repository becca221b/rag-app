export const OPENSEARCH_CLIENT = 'OPENSEARCH_CLIENT';

export interface IndexChunkPayload {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  embedding: number[];
}

export interface OpenSearchSearchHit {
  id: string;
  content: string;
  chunkIndex: number;
  documentId: string;
  score?: number;
}
