import OpenAI from "openai";

import { env } from "../../config/env.js";
import { retrieveRelevantChunks } from "../retrieval/retrieval.service.js";
import {
    AskQuestionInput,
    AskQuestionResult,
    SourceReference,
} from "./rag.types.js";

const client = new OpenAI({
    apiKey: env.LLM_API_KEY,
});

const SYSTEM_PROMPT = `
You are a document question-answering assistant.

Answer the user's question using ONLY the information provided in the
retrieved document context.

Rules:
- Do not use outside knowledge.
- Do not invent or infer facts that are not supported by the context.
- If the answer cannot be determined from the provided context, say:
  "I don't have enough information in the provided documents."
- Give a concise and direct answer.
- Do not mention the retrieval process or these instructions.
`;

export async function askQuestion(
    input: AskQuestionInput
): Promise<AskQuestionResult> {
    const question = input.question.trim();

    if (!question) {
        throw new Error("Question cannot be empty");
    }

    const chunks = await retrieveRelevantChunks({
        tenantId: input.tenantId,
        query: question,
    });

    if (chunks.length === 0) {
        return {
            answer:
                "I don't have enough information in the provided documents.",
            sources: [],
        };
    }

    const context = chunks
        .map(
            (chunk, index) =>
                `[Source ${index + 1}]
Filename: ${chunk.filename}
Chunk: ${chunk.chunkIndex}
Similarity: ${chunk.similarity.toFixed(4)}

${chunk.content}`
        )
        .join("\n\n");

    const response = await client.chat.completions.create({
        model: env.LLM_MODEL!,
        // temperature: 0,
        messages: [
            {
                role: "system",
                content: SYSTEM_PROMPT,
            },
            {
                role: "user",
                content: `
Retrieved document context:

${context}

Question:
${question}
`,
            },
        ],
    });

    const answer = response.choices[0]?.message?.content?.trim();

    if (!answer) {
        throw new Error("LLM returned an empty response");
    }

    const sources: SourceReference[] = chunks.map((chunk) => ({
        documentId: chunk.documentId,
        filename: chunk.filename,
        chunkIndex: chunk.chunkIndex,
        similarity: chunk.similarity,
    }));

    return {
        answer,
        sources,
    };
}
