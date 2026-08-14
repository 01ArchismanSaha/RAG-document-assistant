import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export async function extractText(
    buffer: Buffer,
    mimeType: string
): Promise<string> {
    switch (mimeType) {
        case "application/pdf":
            return extractPdfText(buffer);

        case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            return extractDocxText(buffer);

        case "text/plain":
            return buffer.toString("utf-8");

        default:
            throw new Error(`Unsupported file type: ${mimeType}`);
    }
}

async function extractPdfText(buffer: Buffer): Promise<string> {
    const parser = new PDFParse({ data: buffer });

    try {
        const result = await parser.getText();
        return result.text;
    } finally {
        await parser.destroy();
    }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({
        buffer,
    });

    return result.value;
}