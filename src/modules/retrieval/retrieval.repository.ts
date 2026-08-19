import { pool } from "../../infrastructure/database/postgres.js";

export interface RetrievedChunk {
    chunkId: string;
    documentId: string;
    filename: string;
    content: string;
    chunkIndex: number;
    similarity: number;
}

export interface SearchChunksInput {
    tenantId: string;
    embedding: number[];
    topK: number;
    similarityThreshold: number;
}

export async function searchSimilarChunks(
    input: SearchChunksInput
): Promise<RetrievedChunk[]> {
    const result = await pool.query(
        `
        SELECT
            dc.id AS chunk_id,
            dc.document_id,
            d.filename,
            dc.content,
            dc.chunk_index,
            1 - (dc.embedding <=> $1::vector) AS similarity
        FROM document_chunks dc
        INNER JOIN documents d
            ON d.id = dc.document_id
        WHERE dc.tenant_id = $2
          AND d.tenant_id = $2
          AND dc.embedding IS NOT NULL
          AND d.status = 'ready'
          AND 1 - (dc.embedding <=> $1::vector) >= $3
        ORDER BY dc.embedding <=> $1::vector
        LIMIT $4
        `,
        [
            `[${input.embedding.join(",")}]`,
            input.tenantId,
            input.similarityThreshold,
            input.topK,
        ]
    );

    return result.rows.map((row) => ({
        chunkId: row.chunk_id,
        documentId: row.document_id,
        filename: row.filename,
        content: row.content,
        chunkIndex: row.chunk_index,
        similarity: Number(row.similarity),
    }));
}