import { createHash } from "crypto";

import { pool } from "../../infrastructure/database/postgres.js";
import { generateEmbedding } from "../ai/embedding.service.js";
import { chunkText } from "./chunker.js";
import {
    createDocument,
    createDocumentChunks,
    updateDocumentStatus,
} from "./document.repository.js";
import { extractText } from "./text-extractor.js";

export interface IngestDocumentInput {
    tenantId: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    contentHash: string;
    category: string;
    buffer: Buffer;
}

export interface IngestDocumentResult {
    documentId: string;
    chunkCount: number;
}

export async function ingestDocument(
    input: IngestDocumentInput
): Promise<IngestDocumentResult> {
    const client = await pool.connect();

    let documentId: string | undefined;

    try {
        // Create the document record first.
        const document = await createDocument(client, {
            tenantId: input.tenantId,
            filename: input.filename,
            mimeType: input.mimeType,
            sizeBytes: input.sizeBytes,
            contentHash: input.contentHash,
            category: input.category,
        });

        documentId = document.id;

        await updateDocumentStatus(
            client,
            documentId,
            "processing"
        );

        // Extract text from the uploaded file.
        const text = await extractText(
            input.buffer,
            input.mimeType
        );

        if (!text.trim()) {
            throw new Error("Document contains no extractable text");
        }

        // Split the extracted text into chunks.
        const chunks = chunkText(text);

        if (chunks.length === 0) {
            throw new Error("Document produced no chunks");
        }

        // Generate an embedding for every chunk.
        const chunksWithEmbeddings = [];

        for (const chunk of chunks) {
            const embedding = await generateEmbedding(
                chunk.content
            );

            chunksWithEmbeddings.push({
                documentId,
                tenantId: input.tenantId,
                chunkIndex: chunk.index,
                content: chunk.content,
                embedding,
            });
        }

        // Database transaction for the final writes.
        await client.query("BEGIN");

        try {
            await createDocumentChunks(
                client,
                chunksWithEmbeddings
            );

            await updateDocumentStatus(
                client,
                documentId,
                "ready"
            );

            await client.query("COMMIT");
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }

        return {
            documentId,
            chunkCount: chunks.length,
        };
    } catch (error) {
        if (documentId) {
            try {
                await updateDocumentStatus(
                    client,
                    documentId,
                    "failed",
                    error instanceof Error
                        ? error.message
                        : "Unknown ingestion error"
                );
            } catch {
                // Preserve the original ingestion error.
            }
        }

        throw error;
    } finally {
        client.release();
    }
}

export function calculateContentHash(buffer: Buffer): string {
    return createHash("sha256")
        .update(buffer)
        .digest("hex");
}