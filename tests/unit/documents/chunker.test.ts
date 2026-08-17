import { describe, expect, it } from "vitest";
import { chunkText } from "../../../src/modules/documents/chunker";

describe("chunkText", () => {
    it("returns an empty array for empty text", () => {
        expect(chunkText("")).toEqual([]);
        expect(chunkText("   ")).toEqual([]);
    });

    it("returns a single chunk for a single-word document", () => {
        const chunks = chunkText("hello");

        expect(chunks).toHaveLength(1);
        expect(chunks[0]).toEqual({
            index: 0,
            content: "hello",
        });
    });

    it("returns a single chunk when text is smaller than the chunk size", () => {
        const text = "This is a short document.";

        const chunks = chunkText(text);

        expect(chunks).toHaveLength(1);
        expect(chunks[0].content).toBe(text);
    });

    it("splits text larger than one chunk", () => {
        const text = Array(100).fill(
            "The company provides employees with annual leave."
        ).join(" ");

        const chunks = chunkText(text);

        expect(chunks.length).toBeGreaterThan(1);
    });

    it("assigns sequential indexes to chunks", () => {
        const text = Array(100).fill(
            "The company provides employees with annual leave."
        ).join(" ");

        const chunks = chunkText(text);

        chunks.forEach((chunk, index) => {
            expect(chunk.index).toBe(index);
        });
    });

    it("maintains overlap between consecutive chunks", () => {
        const text = Array(100).fill(
            "The company provides employees with annual leave."
        ).join(" ");

        const chunks = chunkText(text);

        expect(chunks.length).toBeGreaterThan(1);

        for (let i = 1; i < chunks.length; i++) {
            const previousChunk = chunks[i - 1].content;
            const currentChunk = chunks[i].content;

            const overlapStart = previousChunk.slice(-100);

            expect(currentChunk).toContain(overlapStart);
        }
    });

    it("throws when overlap is greater than or equal to chunk size", () => {
        expect(() =>
            chunkText("This is some test content.", {
                chunkSize: 100,
                overlap: 100,
            })
        ).toThrow("CHUNK_OVERLAP must be smaller than CHUNK_SIZE");
    });

    it("removes null characters from extracted text", () => {
        const chunks = chunkText(
            "Hello\0 world. This is a test document."
        );

        expect(chunks).toHaveLength(1);
        expect(chunks[0].content).not.toContain("\0");
        expect(chunks[0].content).toContain("Hello world.");
    });
});