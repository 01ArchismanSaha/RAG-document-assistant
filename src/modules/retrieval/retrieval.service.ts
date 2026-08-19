import { env } from "../../config/env.js";
import { generateEmbedding } from "../ai/embedding.service.js";
import {
    searchSimilarChunks,
    RetrievedChunk,
} from "./retrieval.repository.js";

export interface RetrieveContextInput {
    tenantId: string;
    query: string;
}

export async function retrieveRelevantChunks(
    input: RetrieveContextInput
): Promise<RetrievedChunk[]> {
    const query = input.query.trim();

    if (!query) {
        throw new Error("Query cannot be empty");
    }

    const embedding = await generateEmbedding(query);

    return searchSimilarChunks({
        tenantId: input.tenantId,
        embedding,
        topK: env.TOP_K,
        similarityThreshold: env.SIMILARITY_THRESHOLD,
    });
}