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
    },
    opensearch: {
      node: process.env.OPENSEARCH_NODE ?? '',
      username: process.env.OPENSEARCH_USERNAME ?? '',
      password: process.env.OPENSEARCH_PASSWORD ?? '',
      index: process.env.OPENSEARCH_INDEX ?? 'document-chunks',
    },
  },
});
