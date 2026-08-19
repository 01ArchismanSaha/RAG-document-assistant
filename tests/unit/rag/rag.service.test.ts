import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    retrieveRelevantChunks: vi.fn(),
    create: vi.fn(),
}));

vi.mock("../../../src/modules/retrieval/retrieval.service.js", () => ({
    retrieveRelevantChunks: mocks.retrieveRelevantChunks,
}));

vi.mock("openai", () => ({
    default: class {
        chat = {
            completions: {
                create: mocks.create,
            },
        };
    },
}));

import { askQuestion } from "../../../src/modules/rag/rag.service.js";

describe("askQuestion", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const input = {
        tenantId: "tenant-1",
        question: "What technologies does Archisman know?",
    };

    const retrievedChunks = [
        {
            chunkId: "chunk-1",
            documentId: "document-1",
            filename: "resume.pdf",
            content:
                "Archisman has experience with JavaScript, TypeScript, React.js, Node.js and PostgreSQL.",
            chunkIndex: 0,
            similarity: 0.5938,
        },
        {
            chunkId: "chunk-2",
            documentId: "document-1",
            filename: "resume.pdf",
            content:
                "He has also worked with Docker, AWS, MongoDB and REST APIs.",
            chunkIndex: 1,
            similarity: 0.4224,
        },
    ];

    it("successfully answers a question using retrieved context", async () => {
        mocks.retrieveRelevantChunks.mockResolvedValue(
            retrievedChunks
        );

        mocks.create.mockResolvedValue({
            choices: [
                {
                    message: {
                        content:
                            "Archisman has experience with JavaScript, TypeScript, React.js, Node.js, PostgreSQL, Docker, AWS, MongoDB and REST APIs.",
                    },
                },
            ],
        });

        const result = await askQuestion(input);

        expect(result.answer).toContain("JavaScript");
        expect(result.answer).toContain("Node.js");

        expect(result.sources).toHaveLength(2);

        expect(result.sources[0]).toEqual({
            documentId: "document-1",
            filename: "resume.pdf",
            chunkIndex: 0,
            similarity: 0.5938,
        });

        expect(result.sources[1]).toEqual({
            documentId: "document-1",
            filename: "resume.pdf",
            chunkIndex: 1,
            similarity: 0.4224,
        });

        expect(mocks.retrieveRelevantChunks).toHaveBeenCalledWith({
            tenantId: "tenant-1",
            query: input.question,
        });

        expect(mocks.create).toHaveBeenCalledOnce();
    });

    it("rejects an empty question", async () => {
        await expect(
            askQuestion({
                tenantId: "tenant-1",
                question: "   ",
            })
        ).rejects.toThrow("Question cannot be empty");

        expect(
            mocks.retrieveRelevantChunks
        ).not.toHaveBeenCalled();

        expect(mocks.create).not.toHaveBeenCalled();
    });

    it("returns a fallback answer when no relevant chunks are found", async () => {
        mocks.retrieveRelevantChunks.mockResolvedValue([]);

        const result = await askQuestion({
            tenantId: "tenant-1",
            question: "What is Archisman's blood group?",
        });

        expect(result.answer).toBe(
            "I don't have enough information in the provided documents."
        );

        expect(result.sources).toEqual([]);

        expect(mocks.create).not.toHaveBeenCalled();
    });

    it("propagates retrieval errors", async () => {
        mocks.retrieveRelevantChunks.mockRejectedValue(
            new Error("Retrieval failed")
        );

        await expect(
            askQuestion(input)
        ).rejects.toThrow("Retrieval failed");

        expect(mocks.create).not.toHaveBeenCalled();
    });

    it("propagates LLM errors", async () => {
        mocks.retrieveRelevantChunks.mockResolvedValue(
            retrievedChunks
        );

        mocks.create.mockRejectedValue(
            new Error("LLM API failed")
        );

        await expect(
            askQuestion(input)
        ).rejects.toThrow("LLM API failed");
    });

    it("throws when the LLM returns an empty response", async () => {
        mocks.retrieveRelevantChunks.mockResolvedValue(
            retrievedChunks
        );

        mocks.create.mockResolvedValue({
            choices: [
                {
                    message: {
                        content: "   ",
                    },
                },
            ],
        });

        await expect(
            askQuestion(input)
        ).rejects.toThrow("LLM returned an empty response");
    });
});
