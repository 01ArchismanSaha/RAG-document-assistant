import { env } from "../../config/env";

export interface DocumentChunk {
    index: number;
    content: string;
}

export interface ChunkOptions {
    chunkSize?: number;
    overlap?: number;
}

export function chunkText(
    text: string,
    options: ChunkOptions = {}
): DocumentChunk[] {
    const normalizedText = text
        .replace(/\0/g, "")
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    if (!normalizedText) {
        return [];
    }

    const chunkSize = options.chunkSize ?? env.CHUNK_SIZE;
    const overlap = options.overlap ?? env.CHUNK_OVERLAP;

    if (overlap >= chunkSize) {
        throw new Error(
            "CHUNK_OVERLAP must be smaller than CHUNK_SIZE"
        );
    }

    const chunks: DocumentChunk[] = [];

    let start = 0;
    let index = 0;

    while (start < normalizedText.length) {
        const maxEnd = Math.min(
            start + chunkSize,
            normalizedText.length
        );

        let end = maxEnd;

        // Keep the chunk end at a word boundary.
        if (maxEnd < normalizedText.length) {
            const boundary = normalizedText.lastIndexOf(" ", maxEnd);

            if (boundary > start) {
                end = boundary;
            }
        }

        const content = normalizedText
            .slice(start, end)
            .trim();

        if (content) {
            chunks.push({
                index,
                content,
            });
        }

        if (end >= normalizedText.length) {
            break;
        }

        // Target the configured overlap.
        const desiredStart = Math.max(
            start + 1,
            end - overlap
        );

        // Move backwards to the nearest word boundary.
        const boundary = normalizedText.lastIndexOf(
            " ",
            desiredStart
        );

        if (boundary > start) {
            start = boundary + 1;
        } else {
            start = desiredStart;
        }

        index++;
    }

    return chunks;
}