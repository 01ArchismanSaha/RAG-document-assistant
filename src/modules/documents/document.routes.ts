import { FastifyInstance } from "fastify";

import {
    calculateContentHash,
    DuplicateDocumentError,
    ingestDocument,
} from "./ingestion.service.js";

const SUPPORTED_MIME_TYPES = new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
]);

function getFieldValue(
    field: unknown
): string | undefined {
    if (
        field &&
        typeof field === "object" &&
        !Array.isArray(field) &&
        "type" in field &&
        field.type === "field" &&
        "value" in field &&
        typeof field.value === "string"
    ) {
        return field.value;
    }

    return undefined;
}

export async function documentRoutes(
    app: FastifyInstance
) {
    app.post("/documents", async (request, reply) => {
        const file = await request.file();

        if (!file) {
            return reply.status(400).send({
                error: "A file is required",
            });
        }

        if (!SUPPORTED_MIME_TYPES.has(file.mimetype)) {
            return reply.status(400).send({
                error: `Unsupported file type: ${file.mimetype}`,
            });
        }

        const tenantId = getFieldValue(
            file.fields.tenantId
        );

        const category = getFieldValue(
            file.fields.category
        );

        if (!tenantId) {
            return reply.status(400).send({
                error: "tenantId is required",
            });
        }

        if (!category) {
            return reply.status(400).send({
                error: "category is required",
            });
        }

        const buffer = await file.toBuffer();

        if (buffer.length === 0) {
            return reply.status(400).send({
                error: "Uploaded file is empty",
            });
        }

        const contentHash = calculateContentHash(buffer);

        try {
            const result = await ingestDocument({
                tenantId,
                filename: file.filename,
                mimeType: file.mimetype,
                sizeBytes: buffer.length,
                contentHash,
                category,
                buffer,
            });

            return reply.status(201).send({
                documentId: result.documentId,
                chunkCount: result.chunkCount,
                status: "ready",
            });
        } catch (error) {
            if (error instanceof DuplicateDocumentError) {
                return reply.status(409).send({
                    error: error.message,
                });
            }

            request.log.error(error);

            return reply.status(500).send({
                error: "Document ingestion failed",
            });
        }
    });
}
