export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  opensearch: {
    node: process.env.OPENSEARCH_NODE ?? '',
    username: process.env.OPENSEARCH_USERNAME ?? '',
    password: process.env.OPENSEARCH_PASSWORD ?? '',
    index: process.env.OPENSEARCH_INDEX ?? 'document-chunks',
    rejectUnauthorized: process.env.OPENSEARCH_REJECT_UNAUTHORIZED ?? 'true',
    maxRetries: parseInt(process.env.OPENSEARCH_MAX_RETRIES ?? '3', 10),
    retryDelay: parseInt(process.env.OPENSEARCH_RETRY_DELAY ?? '1000', 10),
  },
  aws: {
    region: process.env.AWS_REGION ?? 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
    s3: {
      bucket: process.env.AWS_S3_BUCKET ?? '',
    },
    bedrock: {
      region: process.env.AWS_BEDROCK_REGION ?? 'us-east-1',
      modelId: process.env.AWS_BEDROCK_MODEL_ID ?? 'anthropic.claude-3-sonnet-20240229-v1:0',
      maxTokens: parseInt(process.env.AWS_BEDROCK_MAX_TOKENS ?? '1000', 10),
    },
    opensearch: {
      node: process.env.OPENSEARCH_NODE ?? '',
      username: process.env.OPENSEARCH_USERNAME ?? '',
      password: process.env.OPENSEARCH_PASSWORD ?? '',
      index: process.env.OPENSEARCH_INDEX ?? 'document-chunks',
    },
  },
  rag: {
    systemPrompt: process.env.RAG_SYSTEM_PROMPT || `You are a professional assistant grounded exclusively in the provided context.

Rules:
1. Answer only using the context provided below.
2. Do not invent, assume, or add facts that are not supported by the context.
3. If the answer cannot be found in the context, say clearly: "No answer found in the provided context."
4. When possible, include the source reference in this format at the end:
   - Documento: <document>
   - Página: <page>
   - Chunk: <chunk>
5. Keep the answer concise, factual, and professional.`,
    chunkSize: parseInt(process.env.RAG_CHUNK_SIZE ?? '800', 10),
    chunkOverlap: parseInt(process.env.RAG_CHUNK_OVERLAP ?? '150', 10),
  },
});
