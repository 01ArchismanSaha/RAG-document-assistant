# Multi-Tenant RAG Document Assistant

A multi-tenant Retrieval-Augmented Generation (RAG) document assistant built with Node.js, TypeScript, PostgreSQL, and pgvector.

## Tech Stack

- Node.js
- TypeScript
- Fastify
- PostgreSQL
- pgvector
- Docker & Docker Compose

## Getting Started

### Prerequisites

- Node.js
- npm
- Docker Desktop

### Installation

Install dependencies:

~~~bash
npm install
~~~

Create the environment file:

~~~bash
cp .env.example .env
~~~

Start PostgreSQL:

~~~bash
docker compose up -d
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
│   └── health/
│       ├── health.routes.ts
│       └── health.service.ts
│
├── app.ts
└── server.ts

migrations/
tests/

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
- [x] Health check endpoint

### Planned

- [ ] Database migrations and schema
- [ ] Multi-tenant document management
- [ ] Document upload and ingestion
- [ ] Text extraction and chunking
- [ ] Embedding generation
- [ ] Vector similarity search
- [ ] RAG question answering
- [ ] Conversation memory
- [ ] Source citations
- [ ] Streaming responses
- [ ] Resilience and retry handling
- [ ] Automated tests
- [ ] API documentation