import { env } from "../../../src/config/env.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    generateEmbedding: vi.fn(),
    searchSimilarChunks: vi.fn(),
}));

vi.mock("../../../src/modules/ai/embedding.service.js", () => ({
    generateEmbedding: mocks.generateEmbedding,
}));

vi.mock(
    "../../../src/modules/retrieval/retrieval.repository.js",
    () => ({
        searchSimilarChunks: mocks.searchSimilarChunks,
    })
);

import { retrieveRelevantChunks } from "../../../src/modules/retrieval/retrieval.service.js";

describe("retrieveRelevantChunks", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("retrieves relevant chunks for a query", async () => {
        const embedding = Array(1536).fill(0.1);

        const chunks = [
            {
                chunkId: "chunk-1",
                documentId: "document-1",
                filename: "leave-policy.txt",
                content:
                    "Employees receive annual leave according to company policy.",
                chunkIndex: 0,
                similarity: 0.91,
            },
            {
                chunkId: "chunk-2",
                documentId: "document-1",
                filename: "leave-policy.txt",
                content:
                    "Leave requests must be submitted through the internal portal.",
                chunkIndex: 1,
                similarity: 0.84,
            },
        ];

        mocks.generateEmbedding.mockResolvedValue(embedding);
        mocks.searchSimilarChunks.mockResolvedValue(chunks);

        const result = await retrieveRelevantChunks({
            tenantId: "tenant-1",
            query: "How much annual leave do employees receive?",
        });

        expect(result).toEqual(chunks);

        expect(mocks.generateEmbedding).toHaveBeenCalledOnce();
        expect(mocks.generateEmbedding).toHaveBeenCalledWith(
            "How much annual leave do employees receive?"
        );

        expect(mocks.searchSimilarChunks).toHaveBeenCalledOnce();
    });

    it("passes the tenant ID to the repository", async () => {
        const embedding = Array(1536).fill(0.1);

        mocks.generateEmbedding.mockResolvedValue(embedding);
        mocks.searchSimilarChunks.mockResolvedValue([]);

        await retrieveRelevantChunks({
            tenantId: "tenant-42",
            query: "What is the leave policy?",
        });

        expect(mocks.searchSimilarChunks).toHaveBeenCalledWith(
            expect.objectContaining({
                tenantId: "tenant-42",
            })
        );
    });

    it("uses the configured top-K value", async () => {
        const embedding = Array(1536).fill(0.1);

        mocks.generateEmbedding.mockResolvedValue(embedding);
        mocks.searchSimilarChunks.mockResolvedValue([]);

        await retrieveRelevantChunks({
            tenantId: "tenant-1",
            query: "What is the leave policy?",
        });

        expect(mocks.searchSimilarChunks).toHaveBeenCalledWith(
            expect.objectContaining({
                topK: 5,
            })
        );
    });

    it("uses the configured similarity threshold", async () => {
        const embedding = Array(1536).fill(0.1);

        mocks.generateEmbedding.mockResolvedValue(embedding);
        mocks.searchSimilarChunks.mockResolvedValue([]);

        await retrieveRelevantChunks({
            tenantId: "tenant-1",
            query: "What is the leave policy?",
        });

        expect(mocks.searchSimilarChunks).toHaveBeenCalledWith(
            expect.objectContaining({
                tenantId: "tenant-1",
                topK: env.TOP_K,
                similarityThreshold: env.SIMILARITY_THRESHOLD,
            })
        );
    });

    it("rejects an empty query", async () => {
        await expect(
            retrieveRelevantChunks({
                tenantId: "tenant-1",
                query: "   ",
            })
        ).rejects.toThrow("Query cannot be empty");

        expect(mocks.generateEmbedding).not.toHaveBeenCalled();
        expect(mocks.searchSimilarChunks).not.toHaveBeenCalled();
    });

    it("propagates embedding generation errors", async () => {
        mocks.generateEmbedding.mockRejectedValue(
            new Error("Embedding API failed")
        );

        await expect(
            retrieveRelevantChunks({
                tenantId: "tenant-1",
                query: "What is the leave policy?",
            })
        ).rejects.toThrow("Embedding API failed");

        expect(mocks.searchSimilarChunks).not.toHaveBeenCalled();
    });
});