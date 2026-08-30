# Product Brief - RAG Application

## 1. Resumen Ejecutivo

RAG Application es una plataforma web completa de Retrieval-Augmented Generation que permite a los usuarios cargar documentos PDF, indexarlos automáticamente, y realizar consultas en lenguaje natural con respuestas fundamentadas exclusivamente en el contenido de esos documentos. La aplicación implementa un pipeline RAG manual sin frameworks de alto nivel (LangChain/LlamaIndex), utilizando servicios de AWS (Bedrock, S3, OpenSearch Serverless) para embeddings, almacenamiento y búsqueda vectorial.

**Stack Tecnológico Principal:**
- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- Backend: NestJS 11, TypeScript, Prisma ORM
- Base de Datos: PostgreSQL
- IA/Infraestructura: AWS Bedrock (Titan Embeddings, Claude/DeepSeek), S3, OpenSearch Serverless

## 2. Problema que Resuelve

La aplicación aborda el problema de la consulta efectiva de grandes volúmenes de documentos PDF sin necesidad de lectura manual. Proporciona:

- **Búsqueda semántica**: Encuentra información relevante basada en significado, no solo coincidencia de palabras clave
- **Respuestas fundamentadas**: Cada respuesta incluye citas a las fuentes específicas (documento, página, chunk)
- **Gestión de conocimiento**: Centraliza y organiza documentos corporativos o personales
- **Interacción conversacional**: Permite diálogos en lenguaje natural con el contenido de los documentos
- **Aislamiento de usuario**: Cada usuario tiene acceso exclusivo a sus propios documentos y búsquedas

## 3. Solución Propuesta

La solución implementa un pipeline RAG completo con los siguientes componentes:

### Pipeline de Procesamiento de Documentos
1. **Upload**: Usuario sube archivos PDF vía interfaz web
2. **Almacenamiento**: Archivos almacenados en AWS S3
3. **Extracción**: Extracción de texto usando pdf-parse
4. **Chunking**: División inteligente en chunks de 800 caracteres con 150 de overlap
5. **Embeddings**: Generación de vectores con Amazon Titan Embeddings
6. **Indexado**: Almacenamiento vectorial en OpenSearch Serverless con k-NN

### Pipeline de Consulta RAG
1. **Query**: Usuario formula pregunta en lenguaje natural
2. **Embedding**: Generación de embedding de la consulta
3. **Retrieval**: Búsqueda vectorial en OpenSearch (top-k=5)
4. **Context Building**: Compilación de chunks relevantes
5. **Generation**: Generación de respuesta con Claude/DeepSeek usando el contexto
6. **Citation**: Mapeo de respuestas a fuentes específicas

### Arquitectura de Usuarios
- Autenticación JWT con bcrypt para password hashing
- Aislamiento completo de datos por usuario en todos los niveles (base de datos, OpenSearch, S3)
- Sesiones de chat persistentes con historial de conversaciones

## 4. Público Objetivo / Usuarios

**Usuarios Primarios:**
- Profesionales que necesitan consultar documentación técnica, legal o corporativa
- Equipos de investigación que trabajan con grandes volúmenes de PDFs
- Organizaciones que requieren búsqueda semántica en documentos internos
- Usuarios individuales que desean organizar y consultar sus documentos personales

**Casos de Uso Típicos:**
- Consulta de políticas corporativas (PTO, seguridad, compliance)
- Búsqueda en documentación técnica o manuales
- Análisis de contratos o documentos legales
- Revisión de documentación de proyectos
- Investigación académica en documentos PDF

## 5. Arquitectura Técnica

### Frontend (Next.js 16)

**Estructura de Directorios:**
```
frontend/
├── app/
│   ├── (app)/              # Grupo de rutas autenticadas
│   │   ├── chat/           # Interfaz de chat
│   │   ├── dashboard/      # Dashboard principal
│   │   └── documents/      # Gestión de documentos
│   ├── login/              # Página de login
│   ├── register/           # Página de registro
│   └── layout.tsx          # Layout principal
├── components/
│   ├── chat/               # Componentes de chat (ChatView, MessageItem, SourceCard)
│   ├── ui/                 # Componentes UI base (Button, Input, misc)
│   ├── app-shell.tsx       # Shell de la aplicación
│   ├── app-sidebar.tsx     # Sidebar de navegación
│   ├── auth-form.tsx       # Formulario de autenticación
│   ├── documents-view.tsx  # Vista de documentos
│   └── document-status.tsx # Badge de estado de documentos
└── lib/
    ├── api.ts              # Cliente API con fallback a mock
    ├── auth-context.tsx    # Contexto de autenticación
    ├── mock-db.ts          # Mock database para desarrollo
    ├── types.ts            # TypeScript types
    └── utils.ts            # Utilidades
```

**Dependencies Clave:**
- `next@^16.2.10`, `react@^19.2.7`, `react-dom@^19.2.7`
- `swr@^2.4.2` para data fetching
- `lucide-react@^1.25.0` para iconos
- `tailwindcss@^4.3.3` para estilos
- `clsx`, `tailwind-merge` para className utilities

### Backend (NestJS 11)

**Estructura de Módulos:**
```
backend/src/
├── auth/                   # Autenticación JWT
│   ├── dto/               # RegisterDto, LoginDto
│   ├── guards/            # JwtAuthGuard
│   ├── strategies/        # JWT Strategy
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── documents/             # CRUD de documentos
│   ├── documents.controller.ts
│   ├── documents.service.ts
│   └── documents.module.ts
├── upload/                # Upload de archivos
│   ├── dto/               # UploadFilesDto
│   ├── upload.controller.ts
│   ├── upload.service.ts
│   └── upload.module.ts
├── pdf/                   # Extracción de texto PDF
│   ├── pdf.service.ts
│   └── pdf.module.ts
├── chunking/              # Chunking de texto
│   ├── chunking.service.ts
│   └── chunking.module.ts
├── embeddings/            # Generación de embeddings
│   ├── bedrock-titan-provider.ts
│   ├── embedding-provider.interface.ts
│   ├── embeddings.service.ts
│   └── embeddings.module.ts
├── indexing/              # Coordinación de indexado
│   ├── document-indexer.service.ts
│   ├── indexing.service.ts
│   └── indexing.module.ts
├── opensearch/            # Cliente OpenSearch
│   ├── opensearch.service.ts
│   ├── opensearch.types.ts
│   └── opensearch.module.ts
├── retrieval/             # Búsqueda vectorial
│   ├── retrieval.service.ts
│   └── retrieval.module.ts
├── generation/            # Generación de respuestas
│   ├── generation.service.ts
│   └── generation.module.ts
├── chat/                  # Orquestación RAG
│   ├── dto/               # QueryDto
│   ├── chat.controller.ts
│   ├── chat.service.ts
│   └── chat.module.ts
├── storage/               # S3 Service
│   ├── s3.service.ts
│   └── storage.module.ts
├── aws/                   # Configuración AWS
│   ├── aws.constants.ts
│   └── aws.module.ts
├── database/              # Prisma Service
│   ├── prisma.service.ts
│   └── database.module.ts
├── config/                # Configuración
│   ├── configuration.ts
│   └── env.validation.ts
└── common/
    └── decorators/        # User decorator
```

**Dependencies Clave:**
- `@nestjs/common@^11.0.1`, `@nestjs/core@^11.0.1`
- `@prisma/client@^6.16.2`, `prisma@^6.16.2`
- `@aws-sdk/client-bedrock@^3.1085.0`
- `@aws-sdk/client-s3@^3.1085.0`
- `@opensearch-project/opensearch@^3.6.0`
- `pdf-parse@^2.4.5`
- `bcryptjs@^3.0.3`
- `passport-jwt@^4.0.1`

### Base de Datos (PostgreSQL + Prisma)

**Schema Completo:**
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  documents   Document[]
  chatSessions ChatSession[]
}

model Document {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  filename    String
  originalName String
  mimeType    String
  size        Int
  s3Key       String
  s3Url       String
  status      DocumentStatus @default(UPLOADED)
  error       String?
  indexedAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  chunks Chunk[]
}

model Chunk {
  id         String   @id @default(cuid())
  documentId String
  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  content    String
  chunkIndex Int
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model ChatSession {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  messages Message[]
}

model Message {
  id           String       @id @default(cuid())
  chatSessionId String
  chatSession  ChatSession  @relation(fields: [chatSessionId], references: [id], onDelete: Cascade)
  role         MessageRole
  content      String
  sources      Json?
  createdAt    DateTime     @default(now())
}

enum DocumentStatus {
  UPLOADED
  INDEXING
  INDEXED
  ERROR
}

enum MessageRole {
  USER
  ASSISTANT
}
```

### Infraestructura AWS

**OpenSearch Serverless:**
- Index: `document-chunks-v2`
- Vector dimension: 1536 (configurable)
- k-NN method: HNSW with cosine similarity
- EF construction: 100, M: 16
- User isolation: Filtering por userId en queries

**S3:**
- Key pattern: `documents/{userId}/{timestamp}-{filename}`
- Content type validation
- Presigned URLs para acceso

**Bedrock:**
- Embeddings: `amazon.titan-embed-text-v1`
- Generation: `deepseek.v3.2` (configurable, también soporta Claude)
- Max tokens: 1000 (configurable)

### Docker Compose

**Servicios:**
- PostgreSQL 16 Alpine (puerto 5432)
- Backend NestJS (puerto 3001)
- Frontend Next.js (puerto 3000)
- Health checks para PostgreSQL
- Volúmenes para persistencia de datos

## 6. Funcionalidades Clave Implementadas

### Backend APIs

**Autenticación:**
- `POST /auth/register` - Registro de usuarios
- `POST /auth/login` - Login con JWT

**Documentos:**
- `POST /upload` - Upload múltiple de PDFs (máx 10 archivos)
- `GET /documents` - Listar documentos del usuario
- `GET /documents/:id` - Obtener documento específico
- `DELETE /documents/:id` - Eliminar documento

**Chat RAG:**
- `POST /chat/query` - Realizar consulta RAG
- `POST /chat/sessions` - Crear sesión de chat
- `GET /chat/sessions` - Listar sesiones del usuario
- `GET /chat/sessions/:id` - Obtener sesión específica con mensajes

### Frontend Features

**Dashboard:**
- Estadísticas en tiempo real (total documentos, indexados, en proceso, errores)
- Lista de documentos recientes con status badges
- Lista de conversaciones recientes
- Quick actions para upload y query
- Polling automático (10s para docs, 15s para sesiones)

**Gestión de Documentos:**
- Upload drag-and-drop de múltiples PDFs
- Visualización de estado (UPLOADED, INDEXING, INDEXED, ERROR)
- Información de tamaño y fecha
- Eliminación de documentos

**Chat Interface:**
- Input de texto con auto-resize
- Suggestions de preguntas comunes
- Historial de conversaciones en sidebar
- Carga de sesiones previas
- Display de mensajes con fuentes citadas
- Source cards con información de documento, página y chunk
- Indicadores de pending/loading

**Mock Mode:**
- Fallback automático a mock cuando backend no está disponible
- Data mock completa para desarrollo y demo
- Toggle transparente entre real y mock

### Características Técnicas

**Chunking Strategy:**
- Chunk size: 800 caracteres (configurable)
- Chunk overlap: 150 caracteres (configurable)
- Splitting por oraciones con regex
- Preservación de contexto entre chunks

**Embeddings:**
- Provider: Amazon Titan Embeddings
- Procesamiento batch
- Dimension: 1536
- Strategy pattern para intercambiabilidad de providers

**Vector Search:**
- OpenSearch Serverless con k-NN
- Top-k: 5 chunks relevantes
- Filtrado por userId para seguridad
- Retry logic con exponential backoff (máx 3 reintentos)

**Generation:**
- System prompt configurable
- Context injection con chunks relevantes
- Citación de fuentes en respuestas
- Validación de respuestas vacías

**Security:**
- JWT authentication con 7 días de expiración
- Password hashing con bcrypt
- Guards en todos los endpoints protegidos
- User isolation en database (cascading deletes)
- User isolation en OpenSearch queries
- Environment variables para secrets

## 7. Decisiones de Diseño Relevantes

### Arquitectura

**RAG Manual vs Frameworks:**
- Decisión: Implementación manual sin LangChain/LlamaIndex
- Justificación: Mayor comprensión del pipeline, control total, flexibilidad para hackathon
- Trade-off: Más código boilerplate pero mejor entendimiento y debugging

**Clean Architecture en NestJS:**
- Separación clara de Controllers, Services, DTOs, Modules
- Dependency Injection para todas las dependencias
- Interface-based design (EmbeddingProvider)
- Repository pattern vía Prisma Service

**Frontend Architecture:**
- App Router de Next.js 16 con route groups
- Atomic Design pattern en componentes
- SWR para data fetching y caching
- Context API para autenticación

### Estrategias Técnicas

**Chunking:**
- Splitting por oraciones vs caracteres: Preserva mejor el contexto semántico
- Overlap de 150 caracteres: Mantiene continuidad entre chunks
- Configurable via environment variables

**Background Indexing:**
- Indexado asíncrono después del upload
- No bloquea la respuesta al usuario
- Manejo de errores con actualización de status

**Retry Logic:**
- Implementado en OpenSearch Service
- Exponential backoff (2^attempt * 1000ms)
- Máx 3 reintentos configurables
- Logging detallado de errores

**User Isolation:**
- Multi-tenancy a nivel de aplicación
- Filtrado por userId en todas las queries
- Cascading deletes en Prisma schema
- Security a nivel de datos y búsquedas

### Decisiones de UX

**Real-time Updates:**
- Polling con intervalos diferenciados (10s docs, 15s sesiones)
- Status badges para feedback inmediato
- Loading states en todas las operaciones asíncronas

**Chat Interface:**
- Suggestions para onboarding rápido
- Historial persistente de conversaciones
- Source cards para transparencia de respuestas
- Auto-scroll al último mensaje

**Mock Fallback:**
- Desarrollo sin backend funcional
- Demo capabilities offline
- Fallback transparente con warnings en consola

## 8. Limitaciones Actuales o Deuda Técnica Visible

### Limitaciones Funcionales

**Formatos de Documentos:**
- Solo PDFs soportados actualmente
- Validación estricta a archivos .pdf
- No soporta TXT, DOC, DOCX (aunque mencionados en README)

**Escalabilidad:**
- Procesamiento secuencial de chunks (sin batching real en embeddings)
- Sin colas de jobs para indexado
- Sin rate limiting en APIs

**RAG Pipeline:**
- Sin re-ranking de resultados
- Sin query expansion
- Sin hybrid search (vector + keyword)
- Sin context window management avanzado

### Deuda Técnica

**Testing:**
- Existen archivos `.spec.ts` pero no se verificó su cobertura
- Sin tests end-to-end evidentes
- Sin tests de integración con AWS

**Error Handling:**
- Error handling básico en algunos servicios
- Sin mecanismo de dead letter queue
- Logging extenso pero sin structured logging

**Monitoring:**
- Sin métricas o tracing
- Sin health checks específicos por módulo
- Sin alerting

**Performance:**
- Sin caching de embeddings
- Sin streaming de respuestas de Bedrock
- Sin optimización de batch processing

**Security:**
- JWT secrets en variables de entorno (bueno pero podría mejorarse con secrets manager)
- Sin rate limiting
- Sin input sanitization avanzada
- Sin CSRF protection explícita

### Configuración

**Hardcoding:**
- Algunos valores hardcoded en configuration (chunk sizes, timeouts)
- Model IDs configurable pero con defaults específicos

**Environment:**
- Requiere configuración manual de AWS services
- Sin automatización de infraestructura (Terraform/CloudFormation)
- Docker compose simplificado para desarrollo

## 9. Próximos Pasos Sugeridos

### Corto Plazo (Feature Completeness)

**Formatos Adicionales:**
- Implementar soporte para TXT, DOC, DOCX
- Agregar validación de content types
- Extender PDF service a document service genérico

**Mejoras RAG:**
- Implementar re-ranking de chunks
- Agregar query expansion
- Implementar hybrid search (keyword + vector)
- Agregar citations más precisas

**UI/UX:**
- Agregar preview de documentos
- Implementar filtering y sorting de documentos
- Agregar exportación de conversaciones
- Mejorar mobile responsiveness

### Mediano Plazo (Scalability & Performance)

**Performance:**
- Implementar batching real de embeddings
- Agregar caching con Redis
- Implementar streaming de respuestas
- Optimizar chunking strategy

**Infrastructure:**
- Implementar cola de jobs (BullMQ/SQS) para indexado
- Agregar auto-scaling
- Implementar health checks y readiness probes
- Agregar monitoring (Prometheus/Grafana)

**Testing:**
- Completar cobertura de tests unitarios
- Agregar tests de integración
- Implementar E2E tests con Playwright
- Agregar load testing

---

**Estado del Documento:** Basado en análisis real del código al 27/07/2026. Este documento refleja el estado actual del proyecto y las funcionalidades verificadas en el código fuente.