# Technical Specification - RAG Application

## 1. Overview

### 1.1 Purpose
This technical specification defines the architecture, components, interfaces, and implementation details for the RAG (Retrieval-Augmented Generation) Application. The system enables users to upload PDF documents, automatically index them, and perform natural language queries with AI-generated responses grounded exclusively in the uploaded content.

### 1.1.1 Related Documents
- **Product Brief**: `specs/PRODUCT_BRIEF.md` - Business requirements and system overview
- **Business Rules**: `specs/business-rules.md` - Detailed business rules (BR-XXX references)
- **Architecture Rules**: `../AGENTS.md` - Development guidelines and architectural decisions

### 1.2 Scope
- Document upload and processing pipeline
- Vector-based semantic search using AWS services
- AI-powered response generation with source citations
- User authentication and multi-tenant data isolation
- Real-time chat interface with session management

### 1.3 Stack Technology Requirements

#### Frontend (Mandatory)
- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4
- **State Management**: SWR for data fetching
- **UI Components**: Custom components with Atomic Design pattern

#### Backend (Mandatory)
- **Framework**: NestJS 11
- **Language**: TypeScript (strict mode)
- **ORM**: Prisma with PostgreSQL
- **Authentication**: Passport with JWT strategy
- **Validation**: class-validator and class-transformer

#### Database (Mandatory)
- **Engine**: PostgreSQL 16+
- **ORM**: Prisma 6.16.2+
- **Schema**: Defined in Prisma schema with relations and cascading deletes

#### Infrastructure (Mandatory)
- **Object Storage**: Amazon S3
- **Vector Search**: Amazon OpenSearch Serverless with k-NN
- **AI Services**: Amazon Bedrock (Titan Embeddings, Claude/DeepSeek)
- **Containerization**: Docker & Docker Compose

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Client Layer                         │
│              Next.js 16 Frontend (React 19)              │
│         - Dashboard  - Chat Interface  - Documents       │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS/REST API
┌────────────────────▼────────────────────────────────────┐
│                  Application Layer                        │
│                 NestJS 11 Backend                        │
│  ┌─────────┬─────────┬─────────┬─────────┬──────────┐   │
│  │  Auth   │ Documents│  Chat   │ Upload  │   RAG    │   │
│  │ Module  │ Module  │ Module  │ Module  │ Pipeline │   │
│  └─────────┴─────────┴─────────┴─────────┴──────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┼────────────┬────────────┐
        │            │            │            │
┌───────▼──────┐ ┌──▼──────┐ ┌──▼────────┐ ┌▼──────────┐
│ PostgreSQL   │ │ AWS S3  │ │OpenSearch │ │  AWS      │
│  (Prisma)    │ │         │ │Serverless │ │  Bedrock  │
│              │ │         │ │  k-NN     │ │ (Titan+   │
│- Users       │ │- PDFs   │ │- Chunks   │ │  Claude)  │
│- Documents   │ │         │ │- Embeds   │ │           │
│- Chunks      │ │         │ │           │ │           │
│- Sessions    │ │         │ │           │ │           │
│- Messages    │ │         │ │           │ │           │
└──────────────┘ └─────────┘ └───────────┘ └───────────┘
```

### 2.2 Component Architecture

#### Frontend Components
- **App Shell**: Main layout with navigation and authentication state
- **Dashboard**: Real-time statistics and recent activity
- **Documents View**: Upload interface and document management
- **Chat Interface**: Conversational UI with source citations
- **Auth Forms**: Login and registration components

#### Backend Modules
- **Auth Module**: JWT authentication, user management
- **Documents Module**: CRUD operations, status management
- **Upload Module**: File validation, S3 integration
- **PDF Module**: Text extraction from PDF files
- **Chunking Module**: Text segmentation with overlap
- **Embeddings Module**: Vector generation via AWS Bedrock
- **Indexing Module**: OpenSearch indexing coordination
- **Retrieval Module**: Vector search and context building
- **Generation Module**: AI response generation
- **Chat Module**: RAG orchestration and session management
- **Storage Module**: S3 operations and presigned URLs
- **Database Module**: Prisma service and connection management

## 3. Data Model

### 3.1 Database Schema (PostgreSQL + Prisma)

#### User Entity
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String   // bcrypt hashed
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  relations:
  documents   Document[]
  chatSessions ChatSession[]
  
  constraints:
  - email uniqueness (BR-001)
  - password encryption (BR-050)
}
```

#### Document Entity
```prisma
model Document {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  filename    String
  originalName String
  mimeType    String   // "application/pdf" only (BR-006, BR-007)
  size        Int      // > 0 bytes (BR-009)
  s3Key       String   // pattern: documents/{userId}/{timestamp}-{filename}
  s3Url       String
  status      DocumentStatus @default(UPLOADED)
  error       String?
  indexedAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  relations:
  chunks Chunk[]
  
  constraints:
  - user ownership (BR-015)
  - cascading deletes (BR-005)
  
  enum status:
  - UPLOADED
  - INDEXING
  - INDEXED
  - ERROR
}
```

#### Chunk Entity
```prisma
model Chunk {
  id         String   @id @default(cuid())
  documentId String
  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  content    String   // max 800 chars (BR-017)
  chunkIndex Int      // maintains order (BR-068)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  constraints:
  - document association (BR-067)
  - ordering preservation (BR-068)
}
```

#### ChatSession Entity
```prisma
model ChatSession {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String?  // auto-generated from first query, max 50 chars (BR-036)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  relations:
  messages Message[]
  
  constraints:
  - user ownership (BR-042)
  - timestamp updates (BR-043)
}
```

#### Message Entity
```prisma
model Message {
  id           String       @id @default(cuid())
  chatSessionId String
  chatSession  ChatSession  @relation(fields: [chatSessionId], references: [id], onDelete: Cascade)
  role         MessageRole  // USER or ASSISTANT (BR-038)
  content      String
  sources      Json?        // chunk references with scores (BR-039)
  createdAt    DateTime     @default(now()) // UTC (BR-078)
  
  constraints:
  - session association (BR-067)
  - non-repudiation (BR-071)
  
  enum role:
  - USER
  - ASSISTANT
}
```

### 3.2 OpenSearch Index Schema

#### Index Configuration
```json
{
  "index": "document-chunks-v2",
  "settings": {
    "index": {
      "knn": true,
      "knn.algo_param.ef_search": 100
    }
  },
  "mappings": {
    "properties": {
      "content": { "type": "text" },
      "documentId": { "type": "keyword" },
      "userId": { "type": "keyword" },
      "sourceFilename": { "type": "keyword" },
      "chunkIndex": { "type": "integer" },
      "pageNumber": { "type": "integer" },
      "embedding": {
        "type": "knn_vector",
        "dimension": 1536,
        "method": {
          "name": "hnsw",
          "space_type": "cosinesimil",
          "parameters": {
            "ef_construction": 100,
            "m": 16
          }
        }
      }
    }
  }
}
```

## 4. API Specification

### 4.1 Authentication Endpoints

#### POST /auth/register
**Purpose**: Register a new user account

**Request Body**:
```json
{
  "email": "string (valid email format)",
  "password": "string (min length)",
  "name": "string (optional)"
}
```

**Response**:
```json
{
  "access_token": "string (JWT)",
  "user": {
    "id": "string",
    "email": "string",
    "name": "string | null"
  }
}
```

**Validation Rules**:
- Email format validation (BR-073)
- Email uniqueness check (BR-001)
- Password minimum length (BR-074)
- Password bcrypt hashing (BR-050)

#### POST /auth/login
**Purpose**: Authenticate existing user

**Request Body**:
```json
{
  "email": "string",
  "password": "string"
}
```

**Response**:
```json
{
  "access_token": "string (JWT, 7 days expiry)",
  "user": {
    "id": "string",
    "email": "string",
    "name": "string | null"
  }
}
```

**Security**:
- JWT with 7-day expiration (BR-003)
- Bcrypt password verification (BR-050)

### 4.2 Document Management Endpoints

#### POST /upload
**Purpose**: Upload multiple PDF files

**Request**: 
- Content-Type: multipart/form-data
- Field: `files` (max 10 files) (BR-008)
- Authentication: Required (BR-002)

**File Validation**:
- Content-Type: "application/pdf" (BR-007)
- Extension: .pdf (BR-006)
- Size: > 0 bytes (BR-009)
- Max files: 10 per request (BR-008)

**Response**:
```json
[
  {
    "id": "string",
    "filename": "string",
    "originalName": "string",
    "mimeType": "string",
    "size": "number",
    "status": "UPLOADED",
    "createdAt": "ISO8601",
    "indexedAt": "null"
  }
]
```

**Process Flow**:
1. Validate files (BR-007, BR-009)
2. Upload to S3 (BR-061 error handling)
3. Create document record in database
4. Trigger background indexing (BR-011, BR-012)
5. Return immediate response (BR-012)

#### GET /documents
**Purpose**: List user's documents

**Authentication**: Required (BR-002, BR-004)

**Response**:
```json
[
  {
    "id": "string",
    "filename": "string",
    "originalName": "string",
    "mimeType": "string",
    "size": "number",
    "status": "UPLOADED | INDEXING | INDEXED | ERROR",
    "error": "string | null",
    "createdAt": "ISO8601",
    "indexedAt": "ISO8601 | null"
  }
]
```

**Filtering**: Only documents belonging to authenticated user (BR-004, BR-015)

#### GET /documents/:id
**Purpose**: Get specific document details

**Authentication**: Required (BR-002)

**Parameters**: 
- `id`: Document ID

**Response**: Same as single document object above

**Authorization**: User must own the document (BR-015)

#### DELETE /documents/:id
**Purpose**: Delete document and all associated data

**Authentication**: Required (BR-002)

**Process Flow**:
1. Verify user ownership (BR-015)
2. Delete chunks from OpenSearch
3. Delete chunks from database
4. Delete file from S3
5. Delete document record (cascading) (BR-014)

**Response**:
```json
{
  "message": "Document deleted successfully"
}
```

### 4.3 Chat RAG Endpoints

#### POST /chat/query
**Purpose**: Perform RAG query

**Authentication**: Required (BR-002)

**Request Body**:
```json
{
  "query": "string (natural language)",
  "sessionId": "string | null"
}
```

**Response**:
```json
{
  "response": "string (AI-generated)",
  "sources": [
    {
      "id": "string",
      "content": "string",
      "documentId": "string",
      "sourceFilename": "string",
      "chunkIndex": "number",
      "pageNumber": "number | null",
      "score": "number"
    }
  ],
  "sessionId": "string"
}
```

**RAG Pipeline**:
1. Generate query embedding (BR-025)
2. Search top-5 chunks (BR-026)
3. Filter by user ID (BR-027)
4. Build context from chunks (BR-028)
5. Generate response using context only (BR-029)
6. Include source citations (BR-031)
7. Validate response not empty (BR-032)
8. Limit to 1000 tokens (BR-033)

**Session Handling**:
- If sessionId provided: use existing session (BR-041)
- If no sessionId: create new session (BR-035)
- Auto-generate title from first query (BR-036)

#### POST /chat/sessions
**Purpose**: Create new chat session

**Authentication**: Required (BR-002)

**Response**:
```json
{
  "id": "string",
  "userId": "string",
  "title": "null",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

#### GET /chat/sessions
**Purpose**: List user's chat sessions

**Authentication**: Required (BR-002, BR-004)

**Response**:
```json
[
  {
    "id": "string",
    "userId": "string",
    "title": "string | null",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601",
    "messages": [
      {
        "id": "string",
        "role": "USER | ASSISTANT",
        "content": "string",
        "createdAt": "ISO8601"
      }
    ]
  }
]
```

**Ordering**: By updatedAt descending (BR-040)

#### GET /chat/sessions/:id
**Purpose**: Get specific session with all messages

**Authentication**: Required (BR-002)

**Parameters**: 
- `id`: Session ID

**Response**:
```json
{
  "id": "string",
  "userId": "string",
  "title": "string | null",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601",
  "messages": [
    {
      "id": "string",
      "role": "USER | ASSISTANT",
      "content": "string",
      "sources": "object | null",
      "createdAt": "ISO8601"
    }
  ]
}
```

**Message Ordering**: Chronological ascending (BR-041)

**Error Handling**: 404 if session not found or doesn't belong to user (BR-062)

## 5. RAG Pipeline Specification

### 5.1 Document Processing Pipeline

#### Stage 1: Upload & Storage
```
User Upload → File Validation → S3 Storage → Database Record
```

**Validation Rules**:
- Content-Type: application/pdf (BR-007)
- File extension: .pdf (BR-006)
- File size: > 0 bytes (BR-009)
- Max files: 10 per request (BR-008)

**S3 Key Pattern**: `documents/{userId}/{timestamp}-{filename}` (BR-069)

#### Stage 2: Text Extraction
```
S3 Download → PDF Parse → Text Extraction
```

**Error Handling**:
- Corrupt PDF → ERROR status (BR-055)
- No extractable text → ERROR status (BR-056)

#### Stage 3: Chunking
```
Text → Sentence Split → Chunk Division (800 chars) → Overlap Addition (150 chars)
```

**Chunking Parameters**:
- Max chunk size: 800 characters (BR-017)
- Overlap: 150 characters (BR-018)
- Split strategy: Sentence boundaries (BR-019)
- Short text handling: Single chunk for < 800 chars (BR-063)

#### Stage 4: Embedding Generation
```
Chunks → Batch Processing → Titan Embeddings → 1536-dim Vectors
```

**Specifications**:
- Model: amazon.titan-embed-text-v1 (BR-020)
- Vector dimension: 1536 (BR-021)
- Processing: Sequential batch (current limitation)
- Error handling: Document ERROR on failure (BR-064)

#### Stage 5: Indexing
```
Chunks + Embeddings → OpenSearch Index → User Association
```

**Index Configuration**:
- Index: document-chunks-v2
- Algorithm: HNSW with cosine similarity
- User filtering: userId field (BR-023)
- Retry logic: 3 attempts with exponential backoff (BR-044, BR-045, BR-046)

### 5.2 Query Processing Pipeline

#### Stage 1: Query Processing
```
User Query → Embedding Generation → Vector (1536-dim)
```

**Specifications**:
- Same embedding model as chunks (BR-025)
- Model: amazon.titan-embed-text-v1

#### Stage 2: Retrieval
```
Query Vector → OpenSearch k-NN Search → Top-5 Chunks → User Filter
```

**Search Parameters**:
- Top-k: 5 chunks (BR-026)
- User filter: userId (BR-027)
- Algorithm: HNSW cosine similarity
- Retry logic: 3 attempts with exponential backoff (BR-044, BR-045, BR-046)

#### Stage 3: Context Building
```
Retrieved Chunks → Sort by Score → Context Compilation
```

**Empty Context Handling**: Return "no relevant information" message (BR-030)

#### Stage 4: Response Generation
```
Context + Query → Bedrock Generation → Response Validation → Citation Mapping
```

**Generation Parameters**:
- Model: deepseek.v3.2 (configurable) (BR-029)
- Max tokens: 1000 (BR-033)
- System prompt: Context-only constraint (BR-029)
- Validation: Non-empty response (BR-032)

**Error Handling**: Generic error message to user (BR-065)

## 6. Security Specifications

### 6.1 Authentication & Authorization

#### JWT Implementation
- **Algorithm**: RS256 or HS256
- **Expiration**: 7 days (BR-003)
- **Payload**: user ID, email, name
- **Storage**: HttpOnly cookie or localStorage (frontend implementation)

#### Password Security
- **Hashing**: bcrypt with appropriate salt rounds
- **Validation**: Minimum length requirements (BR-074)
- **Storage**: Never store plain text passwords (BR-050)

#### Authorization Guards
- **Implementation**: NestJS Guards with Passport JWT
- **Scope**: All protected endpoints (BR-052)
- **Validation**: Token presence and validity

### 6.2 Data Isolation

#### Multi-Tenancy Strategy
- **Database**: User ID filtering in all queries (BR-004)
- **OpenSearch**: userId field in all documents and queries (BR-023, BR-027)
- **S3**: User-specific key prefixes (BR-069)
- **Cascading Deletes**: Automatic cleanup on user deletion (BR-005)

#### Access Control
- **Document Ownership**: Users can only access their own documents (BR-015)
- **Session Ownership**: Users can only access their own sessions (BR-042)
- **Cross-User Prevention**: No visibility between users (BR-004)

### 6.3 Input Validation

#### Validation Strategy
- **DTOs**: class-validator decorators on all input DTOs
- **Sanitization**: Input sanitization for file names and content (BR-075)
- **Type Safety**: TypeScript strict mode throughout
- **Length Limits**: Query length validation (BR-057)

#### File Upload Security
- **Content-Type Validation**: Strict application/pdf check (BR-007)
- **Extension Validation**: .pdf extension requirement (BR-006)
- **Size Validation**: Non-zero file size (BR-009)
- **Name Sanitization**: Path traversal prevention (BR-075)

### 6.4 Secrets Management

#### Environment Variables
- **AWS Credentials**: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (BR-054)
- **Database**: DATABASE_URL (BR-054)
- **JWT**: JWT_SECRET (BR-054)
- **Service Endpoints**: OPENSEARCH_ENDPOINT, etc. (BR-054)

#### Configuration Strategy
- **No Hardcoding**: All sensitive data in environment variables (BR-054)
- **Validation**: Environment variable validation on startup
- **Separation**: Different configs for development/production

## 7. Performance Requirements

### 7.1 Response Time Targets

#### API Endpoints
- **Authentication**: < 500ms
- **Document Upload**: < 2s (excluding indexing)
- **Document List**: < 300ms
- **RAG Query**: < 10s (including external AI calls)
- **Session Management**: < 200ms

#### Background Processing
- **Document Indexing**: < 60s per document (async)
- **Embedding Generation**: < 5s per chunk (sequential)
- **OpenSearch Indexing**: < 1s per chunk

### 7.2 Scalability Considerations

#### Current Limitations
- **Sequential Embedding**: No batch processing (noted in Product Brief)
- **No Job Queue**: Indexing runs in-process (noted in Product Brief)
- **No Rate Limiting**: API endpoints unprotected (noted in Product Brief)

#### Recommended Improvements
- **Job Queue**: Implement BullMQ or AWS SQS for indexing
- **Batch Processing**: Parallel embedding generation
- **Caching**: Redis for embedding and query caching
- **Rate Limiting**: Per-user API rate limiting

### 7.3 Real-Time Updates

#### Polling Strategy
- **Documents**: 10-second intervals (BR-049)
- **Sessions**: 15-second intervals (BR-049)
- **Implementation**: SWR with automatic revalidation

#### Future Improvements
- **WebSocket**: Real-time push notifications
- **Event Streaming**: Server-Sent Events for status updates

## 8. Error Handling & Resilience

### 8.1 Retry Logic

#### OpenSearch Operations
- **Max Retries**: 3 attempts (BR-045)
- **Backoff Strategy**: Exponential (2^attempt * 1000ms) (BR-046)
- **Operations**: Indexing, search, deletion

#### AWS Service Failures
- **Bedrock Unavailable**: Retry with exponential backoff (BR-060)
- **S3 Upload Fail**: Transaction rollback, user notification (BR-061)
- **OpenSearch Unavailable**: Retry, then graceful degradation (BR-059)

### 8.2 Error Response Format

#### Standard Error Response
```json
{
  "statusCode": "number",
  "message": "string",
  "error": "string"
}
```

#### Error Categories
- **400 Bad Request**: Validation errors, invalid input
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Authorization failure
- **404 Not Found**: Resource not found (BR-062)
- **500 Internal Server Error**: Unexpected system errors

### 8.3 Logging Strategy

#### Critical Operations Logging
- **Document Upload**: Start, completion, errors (BR-080)
- **Indexing Process**: Stage progress, failures (BR-080)
- **RAG Queries**: Query text, retrieval count, generation time (BR-080)
- **Authentication**: Login attempts, failures (BR-080)

#### Log Levels
- **ERROR**: System failures, security issues
- **WARN**: Retry attempts, degraded performance
- **INFO**: Normal operations, business events
- **DEBUG**: Detailed troubleshooting information

## 9. Deployment Architecture

### 9.1 Container Strategy

#### Docker Compose (Development)
```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]
    
  backend:
    build: ./backend
    ports: ["3001:3001"]
    depends_on: [postgres]
    environment: *AWS credentials*
    
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    depends_on: [backend]
    environment: [NEXT_PUBLIC_API_URL=http://localhost:3001]
```

### 9.2 Infrastructure Requirements

#### AWS Services
- **S3**: Document storage with CORS configuration
- **OpenSearch Serverless**: Vector search with k-NN enabled
- **Bedrock**: Model access for Titan and Claude/DeepSeek
- **IAM**: Appropriate permissions for all services

#### Database
- **PostgreSQL 16+**: Primary data store
- **Connection Pooling**: Via Prisma connection management
- **Backups**: Regular database backups (implementation requirement)

### 9.3 Environment Configuration

#### Required Environment Variables

**Backend**:
```env
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=secret-key
JWT_EXPIRES_IN=7d
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=key
AWS_SECRET_ACCESS_KEY=secret
AWS_S3_BUCKET=bucket-name
AWS_BEDROCK_REGION=us-east-1
OPENSEARCH_ENDPOINT=https://endpoint
OPENSEARCH_USERNAME=username
OPENSEARCH_PASSWORD=password
PORT=3001
```

**Frontend**:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 10. Testing Strategy

### 10.1 Unit Testing

#### Backend Testing
- **Service Layer**: All business logic methods
- **Controller Layer**: Request/response handling
- **Repository Layer**: Database operations
- **Utilities**: Chunking, embedding, formatting

#### Frontend Testing
- **Components**: React component rendering and interaction
- **Hooks**: Custom hook behavior
- **Utilities**: Helper functions
- **API Client**: Mock responses and error handling

### 10.2 Integration Testing

#### API Integration
- **Endpoint Testing**: Full request/response cycles
- **Authentication Flow**: Login/logout scenarios
- **Document Pipeline**: Upload to indexed flow
- **RAG Pipeline**: Query to response flow

#### Service Integration
- **AWS Services**: S3, OpenSearch, Bedrock integration
- **Database**: Prisma operations and transactions
- **Error Scenarios**: Service unavailability handling

### 10.3 End-to-End Testing

#### User Flows
- **Registration & Login**: New user onboarding
- **Document Upload**: Single and multiple file uploads
- **RAG Query**: Question asking with source verification
- **Session Management**: Creating and managing chat sessions

#### Cross-Browser Testing
- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **Responsive Design**: Mobile, tablet, desktop views

## 11. Monitoring & Observability

### 11.1 Application Monitoring

#### Health Checks
- **Database Connectivity**: PostgreSQL connection status
- **Service Availability**: AWS service reachability
- **Resource Usage**: Memory, CPU, disk space

#### Performance Metrics
- **API Response Times**: Endpoint-specific latency
- **External Service Calls**: AWS service latency
- **Background Jobs**: Indexing progress and duration

### 11.2 Business Metrics

#### User Activity
- **Active Users**: Daily/weekly active users
- **Document Uploads**: Upload count and success rate
- **RAG Queries**: Query volume and response quality

#### System Health
- **Indexing Success Rate**: Document processing success/failure
- **Search Performance**: Retrieval latency and relevance
- **Error Rates**: Error frequency by category

## 12. Development Guidelines

### 12.1 Code Standards

#### TypeScript Configuration
- **Strict Mode**: Enabled
- **No Implicit Any**: Disabled
- **Strict Null Checks**: Enabled
- **ESLint**: Configured for NestJS and Next.js

#### Code Organization
- **Clean Architecture**: Separation of concerns
- **SOLID Principles**: Single responsibility, dependency inversion
- **DRY**: No code duplication
- **Naming Conventions**: Consistent across codebase

### 12.2 API Design Principles

#### RESTful Conventions
- **HTTP Methods**: GET, POST, PUT, DELETE appropriately used
- **Status Codes**: Correct HTTP status codes
- **Resource Naming**: Consistent, plural resource names
- **Versioning**: URL versioning when needed

#### Error Handling
- **Consistent Format**: Standard error response structure
- **User-Friendly Messages**: Clear, actionable error messages
- **Logging**: Comprehensive error logging
- **Security**: No sensitive information in error messages

### 12.3 Database Best Practices

#### Schema Design
- **Normalization**: Appropriate normalization level
- **Indexing**: Strategic index placement
- **Relations**: Proper foreign key relationships
- **Constraints**: Database-level constraints where appropriate

#### Query Optimization
- **N+1 Prevention**: Eager loading where needed
- **Pagination**: Large result set pagination
- **Connection Pooling**: Efficient connection management
- **Transaction Management**: Proper transaction boundaries

## 13. Future Considerations

### 13.1 Scalability Enhancements

#### Horizontal Scaling
- **Load Balancing**: Multiple backend instances
- **Session Storage**: Redis for distributed sessions
- **Database Sharding**: User-based data partitioning

#### Performance Optimization
- **Caching Layer**: Redis for frequent queries
- **CDN Integration**: Static asset delivery
- **Database Read Replicas**: Read scaling

### 13.2 Feature Enhancements

#### Document Processing
- **Additional Formats**: TXT, DOC, DOCX support
- **OCR Integration**: Scanned document processing
- **Image Extraction**: Handle image-based PDFs

#### RAG Improvements
- **Hybrid Search**: Combined keyword and vector search
- **Query Expansion**: Automatic query enhancement
- **Re-ranking**: Result re-ranking for relevance
- **Context Window**: Advanced context management

#### User Experience
- **Real-time Updates**: WebSocket implementation
- **Document Preview**: In-app document viewing
- **Advanced Search**: Filtering and sorting options
- **Export Functionality**: Conversation and document export

---

**Document Version**: 1.0  
**Last Updated**: 2026-08-27  
**Status**: Approved for Implementation