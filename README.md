# Multi-Tenant RAG Document Assistant

A multi-tenant Retrieval-Augmented Generation (RAG) document assistant built with Node.js, TypeScript, PostgreSQL, and pgvector.

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

~~~bash
npm install
~~~

Create the environment file:

~~~bash
cp .env.example .env
~~~

Add your OpenAI embedding API key to `.env`:

~~~env
EMBEDDING_API_KEY=your_api_key
~~~

Start PostgreSQL:

~~~bash
docker compose up -d
~~~

Run database migrations:

~~~bash
npm run migrate
~~~

Start the development server:

~~~bash
npm run dev
~~~

The API will be available at:

~~~text
http://localhost:3000
~~~

### Health Check

~~~bash
curl http://localhost:3000/health
~~~

Expected response:

~~~json
{
  "status": "ok",
  "database": "up"
}
~~~

## Project Structure

~~~text
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
│   │   ├── ingestion.service.ts
│   │   └── text-extractor.ts
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
│   └── documents/
│       ├── chunker.test.ts
│       └── ingestion.service.test.ts

.env.example
.gitignore
docker-compose.yml
package.json
tsconfig.json
README.md
~~~

## Current Status

- [x] Node.js + TypeScript project setup
- [x] Fastify server
- [x] Environment configuration
- [x] PostgreSQL connection
- [x] Docker Compose PostgreSQL environment
- [x] pgvector-enabled PostgreSQL
- [x] Database migrations and schema
- [x] Multi-tenant document data model
- [x] PDF, DOCX and TXT text extraction
- [x] Configurable text chunking with overlap
- [x] OpenAI embedding generation
- [x] Vector storage using pgvector
- [x] Document ingestion service
- [x] Unit tests for chunking and ingestion
- [x] Health check endpoint

### Planned

- [ ] Document upload API
- [ ] Vector similarity search
- [ ] RAG question answering
- [ ] Conversation memory
- [ ] Source citations
- [ ] Streaming responses
- [ ] Resilience and retry handling
- [ ] Integration tests
- [ ] API documentation