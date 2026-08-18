import { createHash } from "crypto";

import { pool } from "../../infrastructure/database/postgres.js";
import { generateEmbedding } from "../ai/embedding.service.js";
import { chunkText } from "./chunker.js";
import {
    createDocument,
    createDocumentChunks,
    deleteDocumentChunks,
    findDocumentByTenantAndHash,
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

export class DuplicateDocumentError extends Error {
    constructor(message = "Document already exists") {
        super(message);
        this.name = "DuplicateDocumentError";
    }
}

export class DocumentProcessingError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "DocumentProcessingError";
    }
}

export async function ingestDocument(
    input: IngestDocumentInput
): Promise<IngestDocumentResult> {
    const existingDocument = await findDocumentByTenantAndHash(
        input.tenantId,
        input.contentHash
    );

    let documentId: string;

    if (existingDocument) {
        if (
            existingDocument.status === "ready" ||
            existingDocument.status === "pending" ||
            existingDocument.status === "processing"
        ) {
            throw new DuplicateDocumentError(
                "Document already exists or is currently being processed"
            );
        }

        // Failed document: reuse it for retry.
        documentId = existingDocument.id;
    } else {
        const client = await pool.connect();

        try {
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
        } finally {
            client.release();
        }
    }

    const processingClient = await pool.connect();

    try {
        await updateDocumentStatus(
            processingClient,
            documentId,
            "processing"
        );
    } finally {
        processingClient.release();
    }

    try {
        // Extract text from the uploaded file.
        const text = await extractText(
            input.buffer,
            input.mimeType
        );

        if (!text.trim()) {
            throw new DocumentProcessingError(
                "Document contains no extractable text"
            );
        }

        // Split the extracted text into chunks.
        const chunks = chunkText(text);

        if (chunks.length === 0) {
            throw new DocumentProcessingError(
                "Document produced no chunks"
            );
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

        // Final database writes happen inside a short transaction.
        const client = await pool.connect();

        try {
            await client.query("BEGIN");

            // Remove chunks from a previous failed ingestion.
            await deleteDocumentChunks(
                client,
                documentId
            );

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
        } finally {
            client.release();
        }

        return {
            documentId,
            chunkCount: chunks.length,
        };
    } catch (error) {
        const client = await pool.connect();

        try {
            await updateDocumentStatus(
                client,
                documentId,
                "failed",
                error instanceof Error
                    ? error.message
                    : "Unknown ingestion error"
            );
        } finally {
            client.release();
        }

        throw error;
    }
}

export function calculateContentHash(buffer: Buffer): string {
    return createHash("sha256")
        .update(buffer)
        .digest("hex");
}