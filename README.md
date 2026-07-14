# RAG Application - Document Chat with AI

Una aplicación RAG (Retrieval-Augmented Generation) completa que permite cargar documentos y chatear con ellos usando IA generativa.

## Stack Tecnológico

### Frontend
- **Next.js 16** - Framework React con App Router
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos utility-first

### Backend
- **NestJS** - Framework Node.js
- **TypeScript** - Tipado estático
- **Prisma** - ORM para PostgreSQL
- **Passport/JWT** - Autenticación

### Infraestructura
- **PostgreSQL** - Base de datos relacional
- **Amazon S3** - Almacenamiento de archivos
- **Amazon OpenSearch Serverless** - Búsqueda vectorial
- **Amazon Bedrock** - IA generativa
  - **Titan Embeddings** - Generación de embeddings
  - **Claude Sonnet** - Generación de texto

## Arquitectura

```
┌─────────────┐
│   Next.js   │
│  Frontend   │
└──────┬──────┘
       │ HTTP/REST
┌──────▼──────┐
│   NestJS    │
│   Backend   │
└──────┬──────┘
       │
  ┌────┴────┐
  │         │
┌─▼───┐  ┌─▼────────┐  ┌──────────────┐
│PostgreSQL│  │  AWS S3  │  │ OpenSearch   │
└─────┘  └──────────┘  │  Serverless  │
                       └──────┬───────┘
                              │
                       ┌──────▼───────┐
                       │  AWS Bedrock │
                       │  (Claude +   │
                       │   Titan)     │
                       └──────────────┘
```

## Características

- ✅ Autenticación con JWT
- ✅ Upload de documentos (PDF, TXT, DOC, DOCX)
- ✅ Chunking inteligente de documentos
- ✅ Generación de embeddings con Titan
- ✅ Indexado en OpenSearch Serverless
- ✅ Búsqueda semántica (RAG)
- ✅ Generación de respuestas con Claude Sonnet
- ✅ UI moderna y responsive
- ✅ Docker Compose para desarrollo local

## Prerrequisitos

- Node.js 20+
- Docker & Docker Compose
- Cuenta AWS con acceso a:
  - S3
  - Bedrock
  - OpenSearch Serverless

## Configuración

### 1. Variables de Entorno

Crea un archivo `.env` en el directorio `backend`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rag_db
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-s3-bucket-name
AWS_BEDROCK_REGION=us-east-1
OPENSEARCH_ENDPOINT=https://your-opensearch-endpoint
OPENSEARCH_USERNAME=your-opensearch-username
OPENSEARCH_PASSWORD=your-opensearch-password
PORT=3001
```

Crea un archivo `.env.local` en el directorio `frontend`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 2. Configuración AWS

#### S3 Bucket
1. Crea un bucket S3 en tu cuenta AWS
2. Configura CORS para permitir uploads desde tu dominio
3. Asegúrate de tener permisos de lectura/escritura

#### OpenSearch Serverless
1. Crea una colección OpenSearch Serverless
2. Habilita búsqueda vectorial (k-NN)
3. Configura políticas de acceso
4. Obtén el endpoint, username y password

#### Bedrock
1. Habilita acceso a los modelos:
   - `amazon.titan-embed-text-v1`
   - `anthropic.claude-3-sonnet-20240229-v1:0`
2. Configura permisos de IAM

## Instalación y Ejecución

### Opción 1: Docker Compose (Recomendado)

```bash
# Clonar el repositorio
cd rag-app

# Crear archivo .env en docker/
cp docker/.env.example docker/.env
# Editar docker/.env con tus credenciales AWS

# Iniciar todos los servicios
cd docker
docker-compose up -d

# Ver logs
docker-compose logs -f
```

Los servicios estarán disponibles en:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- PostgreSQL: localhost:5432

### Opción 2: Desarrollo Local

#### Backend

```bash
cd backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Generar Prisma Client
npx prisma generate

# Ejecutar migraciones
npx prisma migrate dev --name init

# Iniciar en modo desarrollo
npm run start:dev
```

#### Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.local.example .env.local
# Editar .env.local

# Iniciar en modo desarrollo
npm run dev
```

## Uso

### 1. Registro/Login
- Abre http://localhost:3000
- Regístrate con email y contraseña
- Inicia sesión

### 2. Upload de Documentos
- Ve al dashboard
- Haz clic en "Choose File" para seleccionar un documento
- El documento se procesará automáticamente:
  - Upload a S3
  - Chunking
  - Generación de embeddings
  - Indexado en OpenSearch

### 3. Chat con Documentos
- En el dashboard, escribe tu pregunta en el campo de chat
- Haz clic en "Ask"
- La aplicación:
  - Genera embedding de la pregunta
  - Busca chunks relevantes en OpenSearch
  - Genera respuesta con Claude usando el contexto
  - Muestra fuentes utilizadas

## Estructura del Proyecto

```
rag-app/
├── frontend/                 # Next.js Frontend
│   ├── src/
│   │   ├── app/             # App Router
│   │   │   ├── page.tsx     # Login page
│   │   │   └── dashboard/   # Dashboard
│   │   ├── components/      # Componentes React
│   │   └── lib/
│   │       └── api/         # API client
│   ├── package.json
│   └── next.config.js
│
├── backend/                  # NestJS Backend
│   ├── src/
│   │   ├── auth/            # Autenticación
│   │   ├── documents/       # CRUD documentos
│   │   ├── embeddings/      # Bedrock Titan
│   │   ├── chunking/        # Chunking service
│   │   ├── indexing/        # OpenSearch indexing
│   │   ├── retrieval/       # OpenSearch retrieval
│   │   ├── generation/      # Bedrock Claude
│   │   ├── chat/            # Orquestación RAG
│   │   ├── storage/         # S3 service
│   │   ├── database/        # Prisma service
│   │   └── config/          # Configuración
│   ├── prisma/
│   │   └── schema.prisma    # Schema de DB
│   └── package.json
│
└── docker/                   # Docker configs
    ├── Dockerfile.backend
    ├── Dockerfile.frontend
    └── docker-compose.yml
```

## Módulos Backend

### Auth Module
- Registro y login de usuarios
- Generación y validación de JWT
- Guards de autenticación

### Documents Module
- CRUD de documentos
- Upload de archivos
- Gestión de estados (UPLOADED, INDEXING, INDEXED, ERROR)

### Storage Module
- Upload/download de archivos en S3
- Generación de presigned URLs

### Embeddings Module
- Generación de embeddings con Titan
- Procesamiento batch

### Chunking Module
- División de texto en chunks
- Overlap entre chunks
- Splitting por oraciones

### Indexing Module
- Indexado de chunks en OpenSearch
- Coordinación del proceso de indexado
- Manejo de errores

### Retrieval Module
- Búsqueda semántica en OpenSearch
- Retrieval de chunks relevantes

### Generation Module
- Generación de respuestas con Claude
- Construcción de prompts con contexto

### Chat Module
- Orquestación del flujo RAG completo
- Gestión de sesiones de chat
- Almacenamiento de mensajes

## Patrones de Diseño

- **Dependency Injection** - NestJS DI system
- **Repository Pattern** - Abstracción de datos
- **Service Layer** - Separación de lógica
- **Strategy Pattern** - Auth strategies
- **Factory Pattern** - Creación de prompts/chunks
- **Singleton Pattern** - Servicios de conexión

## Desarrollo

### Backend

```bash
cd backend
npm run start:dev      # Modo desarrollo con hot reload
npm run build          # Build para producción
npm run start:prod     # Ejecutar build de producción
npm run test           # Ejecutar tests
npm run test:e2e       # Tests end-to-end
npm run lint           # Linting
```

### Frontend

```bash
cd frontend
npm run dev            # Modo desarrollo
npm run build          # Build para producción
npm run start          # Ejecutar build de producción
npm run lint           # Linting
```

## Troubleshooting

### Error: Database connection failed
- Verifica que PostgreSQL esté corriendo
- Verifica la DATABASE_URL en .env
- Asegúrate de que las migraciones se ejecutaron

### Error: AWS credentials not found
- Verifica AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY
- Asegúrate de que las credenciales tengan los permisos necesarios

### Error: OpenSearch connection failed
- Verifica OPENSEARCH_ENDPOINT
- Verifica username y password
- Asegúrate de que la colección esté activa

### Error: Bedrock model not accessible
- Verifica que los modelos estén habilitados en Bedrock
- Verifica permisos de IAM
- Verifica la región configurada

## Seguridad

- JWT para autenticación
- Validación de inputs con class-validator
- Sanitización de datos
- CORS configurado
- Secrets management via environment variables
- No hardcoding de credenciales

## Licencia

MIT

## Contribuciones

Las contribuciones son bienvenidas. Por favor abre un issue o PR para cualquier mejora.
