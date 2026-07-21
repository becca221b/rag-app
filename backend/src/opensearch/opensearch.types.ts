export const OPENSEARCH_CLIENT = 'OPENSEARCH_CLIENT';

export interface IndexChunkPayload {
  id: string;
  documentId: string;
  userId: string;
  content: string;
  chunkIndex: number;
  embedding: number[];
}

export interface OpenSearchSearchHit {
  id: string;
  content: string;
  chunkIndex: number;
  documentId: string;
  userId: string;
  score?: number;
}

export interface OpenSearchSearchResponse {
  body: {
    hits?: {
      hits?: OpenSearchHitItem[];
    };
  };
}

export interface OpenSearchHitItem {
  _id: string;
  _source: {
    content: string;
    chunkIndex: number;
    documentId: string;
    userId: string;
  };
  _score?: number;
}

export interface OpenSearchQuery {
  size: number;
  query: {
    bool: {
      must: Array<{
        knn?: {
          embedding: {
            vector: number[];
            k: number;
          };
        };
        term?: {
          userId: string;
        };
      }>;
    };
  };
}
