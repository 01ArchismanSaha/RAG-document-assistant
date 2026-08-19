# Multi-Tenant RAG Document Assistant

A multi-tenant Retrieval-Augmented Generation (RAG) document assistant built with Node.js, TypeScript, PostgreSQL, and pgvector.

The system supports tenant-isolated document ingestion, text extraction, configurable chunking, OpenAI embeddings, vector similarity search, and RAG-based question answering.

## Tech Stack

- Node.js
- TypeScript
- Fastify
- PostgreSQL
- pgvector
- Docker & Docker Compose
- OpenAI Embeddings
- Vitest

## Getting Started

### Prerequisites

- Node.js
- npm
- Docker Desktop
- OpenAI API key

### Installation

Install dependencies:

```bash
npm install
```

Create the environment file:

```bash
cp .env.example .env
```

Add your OpenAI embedding API key to `.env`:

```env
EMBEDDING_API_KEY=your_api_key
```

Start PostgreSQL:

```bash
docker compose up -d
```

Run database migrations:

```bash
npm run migrate
```

Start the development server:

```bash
npm run dev
```

The API will be available at:

```text
http://localhost:3000
```

## API

### Health Check

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "ok",
  "database": "up"
}
```

### Upload a Document

The document ingestion endpoint accepts PDF, DOCX, and plain-text files.

```bash
curl -X POST http://localhost:3000/documents \
  -F "tenantId=tenant-1" \
  -F "category=resume" \
  -F "file=@document.pdf"
```

A successful response looks like:

```json
{
  "documentId": "document-uuid",
  "chunkCount": 5,
  "status": "ready"
}
```

The ingestion pipeline:

1. Validates the uploaded file.
2. Calculates a SHA-256 content hash.
3. Checks for an existing document for the same tenant.
4. Extracts text from the document.
5. Splits the text into overlapping chunks.
6. Generates an embedding for each chunk.
7. Stores the chunks and embeddings in PostgreSQL using pgvector.
8. Marks the document as `ready`.

### Duplicate Documents

Documents are uniquely identified per tenant using:

```text
tenant_id + content_hash
```

Uploading a document that has already been successfully ingested, or is currently being processed, returns:

```text
409 Conflict
```

Previously failed documents can be re-ingested using the same tenant and content hash.

### Query Documents

The query endpoint performs tenant-isolated semantic retrieval and uses the retrieved document context to generate an answer.

```bash
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant-1",
    "question": "What technologies does Archisman know?"
  }'
```

A successful response includes the generated answer and the document chunks used as sources:

```json
{
  "answer": "Archisman knows JavaScript, HTML, CSS, Node.js, Express.js, React.js, TypeScript, MySQL, MongoDB, and REST APIs.",
  "sources": [
    {
      "documentId": "document-uuid",
      "filename": "resume.pdf",
      "chunkIndex": 0,
      "similarity": 0.57
    }
  ]
}
```

The query pipeline:

1. Validates the tenant and question.
2. Generates an embedding for the question.
3. Performs tenant-isolated vector similarity search.
4. Filters results using the configured similarity threshold.
5. Builds context from the retrieved chunks.
6. Sends the context and question to the LLM.
7. Returns the answer together with source metadata.

## Project Structure

```text
src/
├── config/
│   └── env.ts
│
├── infrastructure/
│   └── database/
│       └── postgres.ts
│
├── modules/
│   ├── ai/
│   │   └── embedding.service.ts
│   │
│   ├── documents/
│   │   ├── chunker.ts
│   │   ├── document.repository.ts
│   │   ├── document.routes.ts
│   │   ├── ingestion.service.ts
│   │   └── text-extractor.ts
│   │
│   ├── rag/
│   │   ├── rag.routes.ts
│   │   ├── rag.service.ts
│   │   └── rag.types.ts
│   │
│   ├── retrieval/
│   │   ├── retrieval.repository.ts
│   │   └── retrieval.service.ts
│   │
│   └── health/
│       ├── health.routes.ts
│       └── health.service.ts
│
├── app.ts
└── server.ts

migrations/
tests/
├── unit/
│   ├── documents/
│   │   ├── chunker.test.ts
│   │   └── ingestion.service.test.ts
│   ├── rag/
│   │   └── rag.service.test.ts
│   └── retrieval/
│       └── retrieval.service.test.ts

.env.example
.gitignore
docker-compose.yml
package.json
tsconfig.json
README.md
```

## Current Status

* [x] Node.js + TypeScript project setup
* [x] Fastify server
* [x] Environment configuration
* [x] PostgreSQL connection
* [x] Docker Compose PostgreSQL environment
* [x] pgvector-enabled PostgreSQL
* [x] Database migrations and schema
* [x] Multi-tenant document data model
* [x] PDF, DOCX and TXT text extraction
* [x] Configurable text chunking with overlap
* [x] OpenAI embedding generation
* [x] Vector storage using pgvector
* [x] Document ingestion service
* [x] Document upload API
* [x] Tenant-aware duplicate document detection
* [x] Failed document re-ingestion
* [x] 409 Conflict handling for duplicate documents
* [x] Vector similarity search
* [x] Tenant-isolated retrieval
* [x] RAG question answering
* [x] Source metadata in RAG responses
* [x] Unit tests for chunking, ingestion, retrieval, and RAG
* [x] Health check endpoint

### Planned

* [ ] Conversation memory
* [ ] Source citations
* [ ] Streaming responses
* [ ] Integration tests
* [ ] API documentation
* [ ] Production resilience and retry handling
