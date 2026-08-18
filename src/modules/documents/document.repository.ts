import { PoolClient } from "pg";
import { pool } from "../../infrastructure/database/postgres.js";

export interface CreateDocumentInput {
    tenantId: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    contentHash: string;
    category: string;
}

export interface DocumentRecord {
    id: string;
    tenantId: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    contentHash: string;
    category: string;
    status: string;
    errorMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateChunkInput {
    documentId: string;
    tenantId: string;
    chunkIndex: number;
    content: string;
    embedding: number[];
}

export async function createDocument(
    client: PoolClient,
    input: CreateDocumentInput
): Promise<DocumentRecord> {
    const result = await client.query(
        `
        INSERT INTO documents (
            tenant_id,
            filename,
            mime_type,
            size_bytes,
            content_hash,
            category
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
            id,
            tenant_id,
            filename,
            mime_type,
            size_bytes,
            content_hash,
            category,
            status,
            error_message,
            created_at,
            updated_at
        `,
        [
            input.tenantId,
            input.filename,
            input.mimeType,
            input.sizeBytes,
            input.contentHash,
            input.category,
        ]
    );

    const row = result.rows[0];

    return {
        id: row.id,
        tenantId: row.tenant_id,
        filename: row.filename,
        mimeType: row.mime_type,
        sizeBytes: row.size_bytes,
        contentHash: row.content_hash,
        category: row.category,
        status: row.status,
        errorMessage: row.error_message,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export async function createDocumentChunks(
    client: PoolClient,
    chunks: CreateChunkInput[]
): Promise<void> {
    for (const chunk of chunks) {
        await client.query(
            `
            INSERT INTO document_chunks (
                document_id,
                tenant_id,
                chunk_index,
                content,
                embedding
            )
            VALUES ($1, $2, $3, $4, $5::vector)
            `,
            [
                chunk.documentId,
                chunk.tenantId,
                chunk.chunkIndex,
                chunk.content,
                `[${chunk.embedding.join(",")}]`,
            ]
        );
    }
}

export async function updateDocumentStatus(
    client: PoolClient,
    documentId: string,
    status: "pending" | "processing" | "ready" | "failed",
    errorMessage: string | null = null
): Promise<void> {
    await client.query(
        `
        UPDATE documents
        SET
            status = $1,
            error_message = $2,
            updated_at = now()
        WHERE id = $3
        `,
        [status, errorMessage, documentId]
    );
}

export async function findDocumentByTenantAndHash(
    tenantId: string,
    contentHash: string
): Promise<DocumentRecord | null> {
    const result = await pool.query(
        `
        SELECT
            id,
            tenant_id,
            filename,
            mime_type,
            size_bytes,
            content_hash,
            category,
            status,
            error_message,
            created_at,
            updated_at
        FROM documents
        WHERE tenant_id = $1
          AND content_hash = $2
        LIMIT 1
        `,
        [tenantId, contentHash]
    );

    const row = result.rows[0];

    if (!row) {
        return null;
    }

    return {
        id: row.id,
        tenantId: row.tenant_id,
        filename: row.filename,
        mimeType: row.mime_type,
        sizeBytes: row.size_bytes,
        contentHash: row.content_hash,
        category: row.category,
        status: row.status,
        errorMessage: row.error_message,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export async function deleteDocumentChunks(
    client: PoolClient,
    documentId: string
): Promise<void> {
    await client.query(
        `
        DELETE FROM document_chunks
        WHERE document_id = $1
        `,
        [documentId]
    );
}