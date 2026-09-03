# Implementation Plan - RAG Application

## Overview

This implementation plan divides the RAG application development into incremental, independently validable stages. Each stage delivers functional components that can be tested and validated before proceeding to the next stage, minimizing dependencies between tasks.

**Technology Stack**:
- Frontend: Next.js 16, TypeScript, Tailwind CSS 4, SWR
- Backend: NestJS 11, TypeScript, Prisma, PostgreSQL
- Infrastructure: AWS S3, OpenSearch Serverless, Bedrock
- Deployment: Vercel (via MCP)

---

## Stage 1: Infrastructure Setup & Configuration

### Objective
Establish the development environment and infrastructure foundation.

### Tasks

#### 1.1 Project Initialization
- Create monorepo structure with `frontend/` and `backend/` directories
- Initialize Next.js 16 project in `frontend/` with App Router
- Initialize NestJS 11 project in `backend/`
- Configure TypeScript strict mode in both projects
- Setup ESLint and Prettier configurations

#### 1.2 Docker Compose Configuration
- Create `docker-compose.yml` with:
  - PostgreSQL 16 service
  - Backend service (build from ./backend)
  - Frontend service (build from ./frontend)
- Configure volume persistence for PostgreSQL
- Setup environment variable injection

#### 1.3 Database Schema Foundation
- Initialize Prisma in backend
- Create initial schema with User model
- Configure PostgreSQL connection
- Run initial migration
- Setup Prisma Client service

#### 1.4 Environment Configuration
- Create `.env.example` files for both frontend and backend
- Document all required environment variables:
  - DATABASE_URL
  - JWT_SECRET
  - AWS credentials
  - OpenSearch credentials
  - S3 bucket name
- Create environment validation service in backend

### Validation Criteria
- Docker Compose starts all services successfully
- PostgreSQL is accessible and Prisma connects
- Environment variables load correctly
- TypeScript compilation succeeds in both projects

### Dependencies
None (foundation stage)

---

## Stage 2: Backend - Authentication Module

### Objective
Implement user authentication and authorization system.

### Tasks

#### 2.1 Database Schema - User
- Add User model to Prisma schema:
  - id, email, password, name, timestamps
  - Index on email for uniqueness
- Run migration
- Create User DTOs (CreateUserDto, LoginDto)

#### 2.2 Auth Service
- Implement password hashing with bcrypt
- Implement JWT token generation (7-day expiry)
- Implement user registration logic
- Implement login validation logic
- Add email uniqueness validation

#### 2.3 Auth Controller
- POST /auth/register endpoint
- POST /auth/login endpoint
- Implement request validation with class-validator
- Add error handling for invalid credentials

#### 2.4 JWT Strategy & Guards
- Configure Passport JWT strategy
- Implement JwtAuthGuard for protected routes
- Implement user extraction from JWT payload
- Add authentication middleware

### Validation Criteria
- User can register with valid email/password
- User cannot register with duplicate email
- User can login with correct credentials
- User cannot login with incorrect credentials
- JWT token is returned and valid for 7 days
- Protected routes return 401 without token

### Dependencies
- Stage 1 (Infrastructure)

### Tests
- Unit tests for AuthService (hashing, validation)
- Unit tests for AuthController (request/response)
- Integration tests for registration flow
- Integration tests for login flow

---

## Stage 3: Backend - Document Management

### Objective
Implement document upload, storage, and CRUD operations.

### Tasks

#### 3.1 Database Schema - Documents
- Add Document model to Prisma schema:
  - Relations to User
  - Fields: filename, originalName, mimeType, size, s3Key, s3Url, status, error, indexedAt
  - DocumentStatus enum (UPLOADED, INDEXING, INDEXED, ERROR)
- Add Chunk model to Prisma schema:
  - Relations to Document
  - Fields: content, chunkIndex
- Run migration
- Create Document DTOs

#### 3.2 S3 Integration
- Configure AWS SDK v3 for S3
- Implement S3 service with upload method
- Implement presigned URL generation
- Configure S3 bucket CORS
- Implement S3 key pattern: `documents/{userId}/{timestamp}-{filename}`

#### 3.3 Upload Module
- Implement file validation:
  - Content-Type: application/pdf
  - Extension: .pdf
  - Size > 0 bytes
  - Max 10 files per request
- Implement multipart form-data handling
- Implement file upload to S3
- Create document record in database
- Return immediate response with document metadata

#### 3.4 Documents Module
- Implement GET /documents endpoint (user-scoped)
- Implement GET /documents/:id endpoint
- Implement DELETE /documents/:id endpoint:
  - Verify user ownership
  - Delete from OpenSearch (placeholder)
  - Delete chunks from database
  - Delete from S3
  - Cascading delete of document record

#### 3.5 Documents Controller
- Wire up all endpoints with guards
- Add request validation
- Implement error handling for unauthorized access

### Validation Criteria
- User can upload valid PDF files
- Invalid files are rejected (wrong type, zero size)
- Upload creates S3 object and database record
- User can list only their own documents
- User can retrieve specific document details
- User can delete their own documents
- User cannot access other users' documents

### Dependencies
- Stage 2 (Authentication)
- Stage 1 (Infrastructure)

### Tests
- Unit tests for S3 service
- Unit tests for file validation logic
- Unit tests for DocumentsService
- Integration tests for upload flow
- Integration tests for CRUD operations
- Authorization tests (cross-user access prevention)

---

## Stage 4: Backend - RAG Indexing Pipeline

### Objective
Implement document processing: PDF extraction, chunking, embeddings, and indexing.

### Tasks

#### 4.1 PDF Extraction Module
- Integrate PDF parsing library (pdf-parse or similar)
- Implement text extraction from S3 files
- Add error handling for corrupt PDFs
- Add validation for extractable text
- Update document status to ERROR on failure

#### 4.2 Chunking Module
- Implement text chunking logic:
  - Max 800 characters per chunk
  - 150 character overlap
  - Sentence boundary splitting
  - Handle short text (< 800 chars) as single chunk
- Preserve chunk order with chunkIndex
- Save chunks to database

#### 4.3 Embeddings Module
- Configure AWS Bedrock SDK
- Implement Titan Embeddings integration (amazon.titan-embed-text-v1)
- Implement batch embedding generation (sequential for now)
- Handle 1536-dimensional vectors
- Add error handling and retry logic

#### 4.4 OpenSearch Integration
- Configure OpenSearch client
- Create index `document-chunks-v2` with k-NN configuration:
  - HNSW algorithm
  - Cosine similarity
  - 1536 dimensions
- Implement document indexing with embeddings
- Add userId field for multi-tenancy
- Implement retry logic (3 attempts, exponential backoff)

#### 4.5 Indexing Orchestration
- Create background job service (in-process for now)
- Implement indexing pipeline:
  1. Download from S3
  2. Extract text
  3. Chunk text
  4. Generate embeddings
  5. Index in OpenSearch
  6. Update document status
- Update document status through pipeline stages
- Handle errors and update status to ERROR

#### 4.6 Trigger Indexing
- Call indexing service after upload
- Implement async processing
- Update document status to INDEXING → INDEXED

### Validation Criteria
- PDF text is extracted correctly
- Text is chunked with proper overlap
- Embeddings are generated (1536 dimensions)
- Chunks are indexed in OpenSearch
- Document status updates correctly through pipeline
- Errors are handled and status set to ERROR
- User isolation works (userId filtering)

### Dependencies
- Stage 3 (Document Management)
- AWS resources (S3, OpenSearch, Bedrock) configured

### Tests
- Unit tests for PDF extraction
- Unit tests for chunking logic
- Unit tests for embedding generation
- Integration tests for indexing pipeline
- Error scenario tests (corrupt PDF, service failures)

---

## Stage 5: Backend - RAG Query Pipeline

### Objective
Implement query processing, retrieval, and AI response generation.

### Tasks

#### 5.1 Database Schema - Chat
- Add ChatSession model to Prisma schema:
  - Relations to User and Message
  - Fields: title (auto-generated), timestamps
- Add Message model to Prisma schema:
  - Relations to ChatSession
  - Fields: role (USER/ASSISTANT), content, sources (JSON), timestamp
- Add MessageRole enum
- Run migration
- Create Chat DTOs

#### 5.2 Query Embedding
- Implement query embedding generation
- Use same Titan Embeddings model
- Generate 1536-dimensional vector

#### 5.3 Retrieval Module
- Implement OpenSearch k-NN search:
  - Top-5 chunks retrieval
  - User filtering by userId
  - Score-based ranking
- Add retry logic (3 attempts, exponential backoff)
- Handle empty results

#### 5.4 Context Building
- Sort retrieved chunks by score
- Compile context from chunk content
- Handle empty context (return "no relevant information")

#### 5.5 Generation Module
- Configure Bedrock for Claude/DeepSeek (deepseek.v3.2)
- Implement response generation:
  - System prompt: context-only constraint
  - Max tokens: 1000
  - Query + context as input
- Validate non-empty response
- Map sources to response

#### 5.6 Chat Module
- Implement POST /chat/query endpoint:
  - Generate query embedding
  - Retrieve chunks
  - Build context
  - Generate response
  - Create/update ChatSession
  - Save USER and ASSISTANT messages
  - Return response with sources
- Implement session handling:
  - Create new session if no sessionId
  - Use existing session if sessionId provided
  - Auto-generate title from first query (max 50 chars)

#### 5.7 Session Management
- Implement POST /chat/sessions endpoint
- Implement GET /chat/sessions endpoint (user-scoped, ordered by updatedAt desc)
- Implement GET /chat/sessions/:id endpoint (with messages, chronological order)
- Add authorization guards

#### 5.8 Chat Controller
- Wire up all endpoints with guards
- Add request validation
- Implement error handling for invalid sessions

### Validation Criteria
- Query embedding is generated correctly
- Top-5 relevant chunks are retrieved
- User filtering prevents cross-user data access
- Response is generated using only provided context
- Sources are included with scores
- Chat sessions are created and managed correctly
- Messages are saved in correct order
- Session titles are auto-generated
- User can only access their own sessions

### Dependencies
- Stage 4 (Indexing Pipeline)
- Stage 2 (Authentication)

### Tests
- Unit tests for retrieval logic
- Unit tests for context building
- Unit tests for generation service
- Integration tests for RAG query flow
- Integration tests for session management
- Authorization tests (cross-user session access)

---

## Stage 6: Frontend - Authentication UI

### Objective
Implement authentication interface and state management.

### Tasks

#### 6.1 Project Configuration
- Configure Tailwind CSS 4
- Setup SWR for data fetching
- Configure API client with base URL
- Setup TypeScript paths

#### 6.2 Authentication State
- Create auth context/hook
- Implement JWT token storage (localStorage or HttpOnly cookie)
- Implement login/logout functions
- Implement user state management

#### 6.3 API Client
- Create API client with interceptors
- Add JWT token to requests
- Handle 401 responses (redirect to login)
- Implement error handling

#### 6.4 Login Page
- Create login form component
- Implement form validation
- Wire up to /auth/login endpoint
- Add error display
- Redirect on success

#### 6.5 Register Page
- Create registration form component
- Implement form validation (email format, password length)
- Wire up to /auth/register endpoint
- Add error display
- Redirect to login on success

#### 6.6 Protected Routes
- Implement route protection wrapper
- Redirect unauthenticated users to login
- Protect dashboard and other pages

### Validation Criteria
- User can register with valid credentials
- User can login with correct credentials
- Invalid credentials show error messages
- Successful login stores token and redirects
- Protected routes redirect to login when unauthenticated
- Logout clears token and redirects

### Dependencies
- Stage 2 (Backend Auth endpoints)

### Tests
- Component tests for login form
- Component tests for register form
- Integration tests for auth flow
- E2E tests for registration and login

---

## Stage 7: Frontend - Document Management UI

### Objective
Implement document upload and management interface.

### Tasks

#### 7.1 Documents API Hooks
- Create SWR hooks for:
  - GET /documents
  - GET /documents/:id
  - DELETE /documents/:id
- Implement optimistic updates for deletion

#### 7.2 Upload Component
- Create file upload component
- Implement drag-and-drop functionality
- Add file validation (PDF only, size check)
- Implement multiple file selection (max 10)
- Show upload progress
- Wire up to POST /upload endpoint

#### 7.3 Documents List
- Create documents list component
- Display document metadata (name, size, status, date)
- Show status badges (UPLOADED, INDEXING, INDEXED, ERROR)
- Implement polling for status updates (10s interval)
- Add delete button with confirmation

#### 7.4 Documents Page
- Create documents page layout
- Combine upload and list components
- Add empty state
- Implement error handling

#### 7.5 Document Detail View
- Create document detail component
- Show full document information
- Display chunk count if indexed
- Add back navigation

### Validation Criteria
- User can upload PDF files via drag-and-drop
- Upload shows progress and completes
- Documents appear in list after upload
- Status updates correctly (UPLOADED → INDEXING → INDEXED)
- Error status displays error message
- User can delete documents
- List refreshes automatically (polling)
- User sees only their own documents

### Dependencies
- Stage 6 (Authentication)
- Stage 3 (Backend Document endpoints)

### Tests
- Component tests for upload component
- Component tests for documents list
- Integration tests for upload flow
- E2E tests for document management

---

## Stage 8: Frontend - Chat Interface

### Objective
Implement conversational RAG interface with source citations.

### Tasks

#### 8.1 Chat API Hooks
- Create SWR hooks for:
  - POST /chat/query
  - GET /chat/sessions
  - GET /chat/sessions/:id
  - POST /chat/sessions
- Implement mutation hooks for queries

#### 8.2 Chat Interface
- Create chat message component
- Implement user/assistant message styling
- Add source citations display
- Show chunk content and scores
- Implement message input with auto-focus

#### 8.3 Session Management
- Create session list component
- Display session titles
- Show last message preview
- Implement session selection
- Add new session button
- Implement polling for updates (15s interval)

#### 8.4 Chat Page
- Create chat page layout
- Combine session list and chat interface
- Implement responsive design
- Add empty state for new sessions
- Handle session creation on first query

#### 8.5 Query Flow
- Implement query submission
- Show loading state during RAG processing
- Display assistant response with sources
- Auto-scroll to latest message
- Handle errors gracefully

### Validation Criteria
- User can submit natural language queries
- Assistant responses appear with sources
- Sources show chunk content and document reference
- Sessions are created automatically
- Session list updates correctly
- User can switch between sessions
- New messages appear in real-time
- Polling updates session list and messages

### Dependencies
- Stage 7 (Documents)
- Stage 5 (Backend Chat endpoints)

### Tests
- Component tests for chat interface
- Component tests for session list
- Integration tests for query flow
- E2E tests for chat functionality

---

## Stage 9: Frontend - Dashboard & Polish

### Objective
Implement dashboard and finalize UI/UX.

### Tasks

#### 9.1 Dashboard Page
- Create dashboard layout
- Display statistics:
  - Total documents
  - Indexed documents
  - Total queries
  - Recent activity
- Implement quick actions (upload, new chat)
- Add navigation to other pages

#### 9.2 Navigation & Layout
- Create app shell with navigation
- Implement responsive sidebar
- Add header with user info
- Implement logout functionality
- Add page transitions

#### 9.3 Error Handling
- Create error boundary component
- Implement global error handling
- Add toast notifications for:
  - Upload success/failure
  - Deletion confirmation
  - API errors
- Implement loading states

#### 9.4 Responsive Design
- Ensure mobile compatibility
- Test on tablet and desktop
- Optimize touch interactions
- Adjust layouts for different screen sizes

#### 9.5 Accessibility
- Add ARIA labels
- Implement keyboard navigation
- Ensure color contrast compliance
- Add focus indicators

### Validation Criteria
- Dashboard displays accurate statistics
- Navigation works across all pages
- Responsive design works on mobile/tablet/desktop
- Error states are handled gracefully
- Toast notifications appear appropriately
- Accessibility requirements are met

### Dependencies
- Stage 8 (Chat Interface)
- Stage 7 (Documents)

### Tests
- Component tests for dashboard
- Accessibility tests
- Responsive design tests
- E2E tests for navigation

---

## Stage 10: Testing & Quality Assurance

### Objective
Comprehensive testing and bug fixes.

### Tasks

#### 10.1 Backend Testing
- Complete unit test coverage (>80%):
  - All services
  - All controllers
  - All utilities
- Complete integration test coverage:
  - API endpoints
  - Database operations
  - AWS service integrations
- Add error scenario tests

#### 10.2 Frontend Testing
- Complete component test coverage (>80%):
  - All UI components
  - All hooks
- Add integration tests:
  - API client
  - Auth flow
- Add E2E tests with Playwright:
  - Registration and login
  - Document upload and management
  - RAG query flow
  - Session management

#### 10.3 Performance Testing
- Test API response times:
  - Authentication < 500ms
  - Document upload < 2s
  - Document list < 300ms
  - RAG query < 10s
- Optimize slow queries
- Add database indexes if needed

#### 10.4 Security Testing
- Test authentication bypasses
- Test authorization bypasses
- Test input validation
- Test file upload security
- Review environment variable handling

#### 10.5 Bug Fixes
- Address all test failures
- Fix reported issues
- Refactor if needed

### Validation Criteria
- All tests pass
- Coverage targets met
- Performance targets met
- Security vulnerabilities addressed
- No critical bugs remaining

### Dependencies
- All previous stages

---

## Stage 11: Deployment - Vercel Configuration

### Objective
Deploy application to Vercel using MCP.

### Tasks

#### 11.1 Backend Deployment Preparation
- Create Vercel project for backend
- Configure environment variables in Vercel:
  - DATABASE_URL (use managed PostgreSQL or external)
  - JWT_SECRET
  - AWS credentials
  - OpenSearch credentials
  - S3 bucket name
- Configure build settings:
  - Build command: `npm run build`
  - Output directory: `dist`
  - Node version: 20+
- Add health check endpoint

#### 11.2 Frontend Deployment Preparation
- Create Vercel project for frontend
- Configure environment variables:
  - NEXT_PUBLIC_API_URL (backend URL)
- Configure build settings:
  - Build command: `npm run build`
  - Output directory: `.next`
  - Node version: 20+
- Configure rewrites for API proxy (if needed)

#### 11.3 Database Setup
- Provision PostgreSQL database:
  - Option A: Vercel Postgres
  - Option B: External PostgreSQL (Neon, Supabase, AWS RDS)
- Run Prisma migrations on production database
- Seed if needed

#### 11.4 AWS Resource Verification
- Verify S3 bucket exists and is accessible
- Verify OpenSearch Serverless collection is configured
- Verify Bedrock model access is enabled
- Configure CORS for S3 bucket
- Verify IAM permissions

#### 11.5 Deployment via MCP
- Use MCP Vercel tools to deploy backend:
  - `mcp0_create_git_project` or `mcp0_deploy_to_vercel`
- Use MCP Vercel tools to deploy frontend:
  - `mcp0_create_git_project` or `mcp0_deploy_to_vercel`
- Configure domain (optional)
- Enable deployment protection (optional)

#### 11.6 Post-Deployment Validation
- Test backend health endpoint
- Test frontend loads correctly
- Test authentication flow
- Test document upload
- Test RAG query
- Verify environment variables are loaded
- Check logs for errors

### Validation Criteria
- Backend deploys successfully
- Frontend deploys successfully
- Application is accessible via Vercel URL
- All critical functionality works in production
- Environment variables are correctly configured
- AWS services are accessible
- No deployment errors in logs

### Dependencies
- All previous stages
- Git repository with code pushed

---

## Stage 12: Documentation & Handoff

### Objective
Complete documentation and prepare for maintenance.

### Tasks

#### 12.1 README
- Create comprehensive README:
  - Project overview
  - Technology stack
  - Setup instructions
  - Environment variables
  - Running locally
  - Deployment instructions
  - Architecture overview

#### 12.2 API Documentation
- Document all API endpoints:
  - Method, path, parameters
  - Request/response examples
  - Authentication requirements
  - Error responses

#### 12.3 Developer Guide
- Create developer guide:
  - Code structure
  - Adding new features
  - Testing guidelines
  - Deployment process
  - Troubleshooting

#### 12.4 Architecture Documentation
- Update architecture diagrams
- Document data flow
- Document RAG pipeline
- Document security measures

#### 12.5 Environment Documentation
- Document all environment variables
- Provide example configurations
- Document AWS resource setup
- Document database schema

### Validation Criteria
- README is complete and accurate
- API documentation covers all endpoints
- Developer guide enables new developers to onboard
- Architecture documentation is up-to-date
- All configurations are documented

### Dependencies
- Stage 11 (Deployment)

---

## Summary

### Total Stages: 12

### Estimated Timeline
- Stages 1-3: Infrastructure & Auth (Week 1)
- Stages 4-5: RAG Pipeline (Week 2)
- Stages 6-8: Frontend (Week 3)
- Stages 9-10: Polish & Testing (Week 4)
- Stages 11-12: Deployment & Documentation (Week 5)

### Key Principles
1. **Incremental Delivery**: Each stage delivers functional, testable code
2. **Independent Validation**: Stages can be validated independently
3. **Minimal Dependencies**: Early stages have few dependencies, later stages build on solid foundation
4. **Continuous Testing**: Tests included in each stage
5. **Deployment Ready**: Final stages prepare for production deployment

### Risk Mitigation
- AWS services configured early (Stage 4-5 dependency)
- Authentication foundation before business logic (Stage 2)
- Frontend built after backend APIs are functional (Stages 6-8)
- Comprehensive testing before deployment (Stage 10)
- Deployment via MCP for streamlined process (Stage 11)

---

**Document Version**: 1.0  
**Created**: 2026-08-30  
**Status**: Ready for Execution
