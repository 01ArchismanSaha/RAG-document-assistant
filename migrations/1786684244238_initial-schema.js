export const shorthands = undefined;

export const up = (pgm) => {
    // Required for UUID generation
    pgm.sql('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    // Enable pgvector
    pgm.sql('CREATE EXTENSION IF NOT EXISTS vector');

    // Documents
    pgm.createTable('documents', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },
        tenant_id: {
            type: 'text',
            notNull: true,
        },
        filename: {
            type: 'text',
            notNull: true,
        },
        mime_type: {
            type: 'text',
            notNull: true,
        },
        size_bytes: {
            type: 'bigint',
            notNull: true,
        },
        content_hash: {
            type: 'text',
            notNull: true,
        },
        category: {
            type: 'text',
            notNull: true,
        },
        status: {
            type: 'text',
            notNull: true,
            default: 'pending',
        },
        error_message: {
            type: 'text',
        },
        created_at: {
            type: 'timestamptz',
            notNull: true,
            default: pgm.func('now()'),
        },
        updated_at: {
            type: 'timestamptz',
            notNull: true,
            default: pgm.func('now()'),
        },
    });

    // Prevent duplicate uploads of the same document for a tenant.
    pgm.addConstraint('documents', 'documents_tenant_content_hash_unique', {
        unique: ['tenant_id', 'content_hash'],
    });

    // Document chunks and embeddings
    pgm.createTable('document_chunks', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },
        document_id: {
            type: 'uuid',
            notNull: true,
            references: 'documents(id)',
            onDelete: 'CASCADE',
        },
        tenant_id: {
            type: 'text',
            notNull: true,
        },
        chunk_index: {
            type: 'integer',
            notNull: true,
        },
        content: {
            type: 'text',
            notNull: true,
        },
        embedding: {
            type: 'vector(1536)',
        },
        created_at: {
            type: 'timestamptz',
            notNull: true,
            default: pgm.func('now()'),
        },
    });

    pgm.addConstraint(
        'document_chunks',
        'document_chunks_document_chunk_index_unique',
        {
            unique: ['document_id', 'chunk_index'],
        }
    );

    // Conversations
    pgm.createTable('conversations', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },
        tenant_id: {
            type: 'text',
            notNull: true,
        },
        created_at: {
            type: 'timestamptz',
            notNull: true,
            default: pgm.func('now()'),
        },
        updated_at: {
            type: 'timestamptz',
            notNull: true,
            default: pgm.func('now()'),
        },
    });

    // Messages
    pgm.createTable('messages', {
        id: {
            type: 'uuid',
            primaryKey: true,
            default: pgm.func('gen_random_uuid()'),
        },
        conversation_id: {
            type: 'uuid',
            notNull: true,
            references: 'conversations(id)',
            onDelete: 'CASCADE',
        },
        role: {
            type: 'text',
            notNull: true,
        },
        content: {
            type: 'text',
            notNull: true,
        },
        created_at: {
            type: 'timestamptz',
            notNull: true,
            default: pgm.func('now()'),
        },
    });

    // Maps assistant messages to the document chunks used as sources.
    pgm.createTable('message_sources', {
        message_id: {
            type: 'uuid',
            notNull: true,
            references: 'messages(id)',
            onDelete: 'CASCADE',
        },
        chunk_id: {
            type: 'uuid',
            notNull: true,
            references: 'document_chunks(id)',
            onDelete: 'CASCADE',
        },
        similarity: {
            type: 'real',
            notNull: true,
        },
    });

    pgm.addConstraint('message_sources', 'message_sources_pkey', {
        primaryKey: ['message_id', 'chunk_id'],
    });

    // Tenant filtering indexes
    pgm.createIndex('documents', ['tenant_id']);
    pgm.createIndex('document_chunks', ['tenant_id']);
    pgm.createIndex('conversations', ['tenant_id']);

    // Category filtering
    pgm.createIndex('documents', ['tenant_id', 'category']);

    // Retrieval support
    pgm.createIndex('document_chunks', ['document_id']);

    // Vector similarity index.
    pgm.sql(`
    CREATE INDEX document_chunks_embedding_idx
    ON document_chunks
    USING hnsw (embedding vector_cosine_ops)
  `);
};

export const down = (pgm) => {
    pgm.dropTable('message_sources');
    pgm.dropTable('messages');
    pgm.dropTable('conversations');
    pgm.dropTable('document_chunks');
    pgm.dropTable('documents');

    pgm.sql('DROP EXTENSION IF EXISTS vector');
};