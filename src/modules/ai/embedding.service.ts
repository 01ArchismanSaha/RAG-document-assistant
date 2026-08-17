import OpenAI from "openai";
import { env } from "../../config/env";

const client = new OpenAI({
    apiKey: env.EMBEDDING_API_KEY,
});

export async function generateEmbedding(text: string): Promise<number[]> {
    const response = await client.embeddings.create({
        model: env.EMBEDDING_MODEL!,
        input: text,
    });

    const firstResult = response.data[0];

    if (!firstResult) {
        throw new Error("Embedding API returned no embedding");
    }

    const embedding = firstResult.embedding;

    if (
        env.EMBEDDING_DIMENSIONS !== undefined &&
        embedding.length !== env.EMBEDDING_DIMENSIONS
    ) {
        throw new Error(
            `Embedding dimension mismatch: expected ${env.EMBEDDING_DIMENSIONS}, got ${embedding.length}`
        );
    }

    return embedding;
}