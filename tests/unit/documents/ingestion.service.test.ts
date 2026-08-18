import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    generateEmbedding: vi.fn(),
    createDocument: vi.fn(),
    createDocumentChunks: vi.fn(),
    updateDocumentStatus: vi.fn(),
    findDocumentByTenantAndHash: vi.fn(),
    deleteDocumentChunks: vi.fn(),
    extractText: vi.fn(),
}));

vi.mock("../../../src/modules/ai/embedding.service.js", () => ({
    generateEmbedding: mocks.generateEmbedding,
}));

vi.mock("../../../src/modules/documents/document.repository.js", () => ({
    createDocument: mocks.createDocument,
    createDocumentChunks: mocks.createDocumentChunks,
    updateDocumentStatus: mocks.updateDocumentStatus,
    findDocumentByTenantAndHash: mocks.findDocumentByTenantAndHash,
    deleteDocumentChunks: mocks.deleteDocumentChunks,
}));

vi.mock("../../../src/modules/documents/text-extractor.js", () => ({
    extractText: mocks.extractText,
}));

import { ingestDocument } from "../../../src/modules/documents/ingestion.service.js";

describe("ingestDocument", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // By default, assume this is a new document.
        mocks.findDocumentByTenantAndHash.mockResolvedValue(null);
    });

    const input = {
        tenantId: "tenant-1",
        filename: "test.txt",
        mimeType: "text/plain",
        sizeBytes: 100,
        contentHash: "test-hash",
        category: "general",
        buffer: Buffer.from("test document"),
    };

    it("successfully ingests a document", async () => {
        mocks.createDocument.mockResolvedValue({
            id: "document-1",
            tenantId: "tenant-1",
            filename: "test.txt",
            mimeType: "text/plain",
            sizeBytes: 100,
            contentHash: "test-hash",
            category: "general",
            status: "pending",
            errorMessage: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        mocks.extractText.mockResolvedValue(
            "The company provides annual leave to employees."
        );

        mocks.generateEmbedding.mockResolvedValue(
            Array(1536).fill(0.1)
        );

        mocks.createDocumentChunks.mockResolvedValue(undefined);
        mocks.updateDocumentStatus.mockResolvedValue(undefined);

        const result = await ingestDocument(input);

        expect(result.documentId).toBe("document-1");
        expect(result.chunkCount).toBe(1);

        expect(mocks.findDocumentByTenantAndHash).toHaveBeenCalledWith(
            input.tenantId,
            input.contentHash
        );

        expect(mocks.createDocument).toHaveBeenCalledOnce();

        expect(mocks.extractText).toHaveBeenCalledWith(
            input.buffer,
            input.mimeType
        );

        expect(mocks.generateEmbedding).toHaveBeenCalledOnce();

        expect(mocks.createDocumentChunks).toHaveBeenCalledOnce();

        expect(mocks.updateDocumentStatus).toHaveBeenCalledWith(
            expect.anything(),
            "document-1",
            "processing"
        );

        expect(mocks.updateDocumentStatus).toHaveBeenCalledWith(
            expect.anything(),
            "document-1",
            "ready"
        );
    });

    it("fails when the document contains no extractable text", async () => {
        mocks.createDocument.mockResolvedValue({
            id: "document-1",
            tenantId: "tenant-1",
            filename: "empty.txt",
            mimeType: "text/plain",
            sizeBytes: 0,
            contentHash: "empty-hash",
            category: "general",
            status: "pending",
            errorMessage: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        mocks.extractText.mockResolvedValue("   ");

        mocks.updateDocumentStatus.mockResolvedValue(undefined);

        await expect(
            ingestDocument(input)
        ).rejects.toThrow(
            "Document contains no extractable text"
        );

        expect(mocks.updateDocumentStatus).toHaveBeenCalledWith(
            expect.anything(),
            "document-1",
            "failed",
            "Document contains no extractable text"
        );

        expect(mocks.generateEmbedding).not.toHaveBeenCalled();
        expect(mocks.createDocumentChunks).not.toHaveBeenCalled();
    });

    it("marks the document as failed when embedding generation fails", async () => {
        mocks.createDocument.mockResolvedValue({
            id: "document-1",
            tenantId: "tenant-1",
            filename: "test.txt",
            mimeType: "text/plain",
            sizeBytes: 100,
            contentHash: "test-hash",
            category: "general",
            status: "pending",
            errorMessage: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        mocks.extractText.mockResolvedValue(
            "The company provides annual leave to employees."
        );

        mocks.generateEmbedding.mockRejectedValue(
            new Error("Embedding API failed")
        );

        mocks.updateDocumentStatus.mockResolvedValue(undefined);

        await expect(
            ingestDocument(input)
        ).rejects.toThrow("Embedding API failed");

        expect(mocks.updateDocumentStatus).toHaveBeenCalledWith(
            expect.anything(),
            "document-1",
            "failed",
            "Embedding API failed"
        );

        expect(mocks.createDocumentChunks).not.toHaveBeenCalled();
    });

    it("retries a previously failed document", async () => {
        mocks.findDocumentByTenantAndHash.mockResolvedValue({
            id: "document-1",
            tenantId: "tenant-1",
            filename: "test.txt",
            mimeType: "text/plain",
            sizeBytes: 100,
            contentHash: "test-hash",
            category: "general",
            status: "failed",
            errorMessage: "Previous ingestion failed",
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        mocks.extractText.mockResolvedValue(
            "The company provides annual leave to employees."
        );

        mocks.generateEmbedding.mockResolvedValue(
            Array(1536).fill(0.1)
        );

        mocks.deleteDocumentChunks.mockResolvedValue(undefined);
        mocks.createDocumentChunks.mockResolvedValue(undefined);
        mocks.updateDocumentStatus.mockResolvedValue(undefined);

        const result = await ingestDocument(input);

        expect(result.documentId).toBe("document-1");
        expect(result.chunkCount).toBe(1);

        // The existing document should be reused.
        expect(mocks.createDocument).not.toHaveBeenCalled();

        // Previous chunks should be removed before new chunks are inserted.
        expect(mocks.deleteDocumentChunks).toHaveBeenCalledWith(
            expect.anything(),
            "document-1"
        );

        expect(mocks.createDocumentChunks).toHaveBeenCalledOnce();

        expect(mocks.updateDocumentStatus).toHaveBeenCalledWith(
            expect.anything(),
            "document-1",
            "processing"
        );

        expect(mocks.updateDocumentStatus).toHaveBeenCalledWith(
            expect.anything(),
            "document-1",
            "ready"
        );
    });

    it("rejects an already-ready duplicate document", async () => {
        mocks.findDocumentByTenantAndHash.mockResolvedValue({
            id: "document-1",
            tenantId: "tenant-1",
            filename: "test.txt",
            mimeType: "text/plain",
            sizeBytes: 100,
            contentHash: "test-hash",
            category: "general",
            status: "ready",
            errorMessage: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        await expect(
            ingestDocument(input)
        ).rejects.toThrow(
            "Document already exists or is currently being processed"
        );

        expect(mocks.createDocument).not.toHaveBeenCalled();
        expect(mocks.extractText).not.toHaveBeenCalled();
        expect(mocks.generateEmbedding).not.toHaveBeenCalled();
        expect(mocks.createDocumentChunks).not.toHaveBeenCalled();
    });

    it("rejects a document that is currently being processed", async () => {
        mocks.findDocumentByTenantAndHash.mockResolvedValue({
            id: "document-1",
            tenantId: "tenant-1",
            filename: "test.txt",
            mimeType: "text/plain",
            sizeBytes: 100,
            contentHash: "test-hash",
            category: "general",
            status: "processing",
            errorMessage: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        await expect(
            ingestDocument(input)
        ).rejects.toThrow(
            "Document already exists or is currently being processed"
        );

        expect(mocks.createDocument).not.toHaveBeenCalled();
        expect(mocks.extractText).not.toHaveBeenCalled();
        expect(mocks.generateEmbedding).not.toHaveBeenCalled();
        expect(mocks.createDocumentChunks).not.toHaveBeenCalled();
    });

});
