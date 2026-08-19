import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    askQuestion: vi.fn(),
}));

vi.mock("../../../src/modules/rag/rag.service.js", () => ({
    askQuestion: mocks.askQuestion,
}));

import { ragRoutes } from "../../../src/modules/rag/rag.routes.js";

describe("POST /query", () => {
    const app = Fastify();

    afterEach(async () => {
        vi.clearAllMocks();
    });

    app.register(ragRoutes);

    it("successfully answers a question", async () => {
        mocks.askQuestion.mockResolvedValue({
            answer: "Archisman has experience with Node.js and React.js.",
            sources: [
                {
                    documentId: "document-1",
                    filename: "resume.pdf",
                    chunkIndex: 0,
                    similarity: 0.5938,
                },
            ],
        });

        const response = await app.inject({
            method: "POST",
            url: "/query",
            payload: {
                tenantId: "tenant-1",
                question: "What technologies does Archisman know?",
            },
        });

        expect(response.statusCode).toBe(200);

        expect(response.json()).toEqual({
            answer: "Archisman has experience with Node.js and React.js.",
            sources: [
                {
                    documentId: "document-1",
                    filename: "resume.pdf",
                    chunkIndex: 0,
                    similarity: 0.5938,
                },
            ],
        });

        expect(mocks.askQuestion).toHaveBeenCalledWith({
            tenantId: "tenant-1",
            question: "What technologies does Archisman know?",
        });
    });

    it("returns 400 when tenantId is missing", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/query",
            payload: {
                question: "What technologies does Archisman know?",
            },
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toEqual({
            error: "tenantId is required",
        });

        expect(mocks.askQuestion).not.toHaveBeenCalled();
    });

    it("returns 400 when tenantId is empty", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/query",
            payload: {
                tenantId: "   ",
                question: "What technologies does Archisman know?",
            },
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toEqual({
            error: "tenantId is required",
        });

        expect(mocks.askQuestion).not.toHaveBeenCalled();
    });

    it("returns 400 when question is missing", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/query",
            payload: {
                tenantId: "tenant-1",
            },
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toEqual({
            error: "question is required",
        });

        expect(mocks.askQuestion).not.toHaveBeenCalled();
    });

    it("returns 400 when question is empty", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/query",
            payload: {
                tenantId: "tenant-1",
                question: "   ",
            },
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toEqual({
            error: "question is required",
        });

        expect(mocks.askQuestion).not.toHaveBeenCalled();
    });

    it("trims tenantId and question before passing them to the service", async () => {
        mocks.askQuestion.mockResolvedValue({
            answer: "Archisman is a Software Engineer.",
            sources: [],
        });

        const response = await app.inject({
            method: "POST",
            url: "/query",
            payload: {
                tenantId: "  tenant-1  ",
                question: "  What is Archisman's role?  ",
            },
        });

        expect(response.statusCode).toBe(200);

        expect(mocks.askQuestion).toHaveBeenCalledWith({
            tenantId: "tenant-1",
            question: "What is Archisman's role?",
        });
    });

    it("returns 500 when the RAG service fails", async () => {
        mocks.askQuestion.mockRejectedValue(
            new Error("LLM API failed")
        );

        const response = await app.inject({
            method: "POST",
            url: "/query",
            payload: {
                tenantId: "tenant-1",
                question: "What technologies does Archisman know?",
            },
        });

        expect(response.statusCode).toBe(500);

        expect(response.json()).toEqual({
            error: "Failed to answer question",
        });
    });

    it("returns 500 when the RAG service returns an unexpected error", async () => {
        mocks.askQuestion.mockRejectedValue(
            new Error("Database connection failed")
        );

        const response = await app.inject({
            method: "POST",
            url: "/query",
            payload: {
                tenantId: "tenant-1",
                question: "What is Archisman's experience?",
            },
        });

        expect(response.statusCode).toBe(500);

        expect(response.json()).toEqual({
            error: "Failed to answer question",
        });
    });
});
