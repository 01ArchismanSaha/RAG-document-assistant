import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    PORT: z.coerce.number().int().positive().default(3000),

    DATABASE_URL: z.string().min(1),

    LLM_PROVIDER: z.string().min(1),
    EMBEDDING_PROVIDER: z.string().min(1),

    LLM_API_KEY: z.string().optional(),
    EMBEDDING_API_KEY: z.string().optional(),

    LLM_MODEL: z.string().optional(),
    EMBEDDING_MODEL: z.string().optional(),

    EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().optional(),

    TOP_K: z.coerce.number().int().positive().default(5),

    SIMILARITY_THRESHOLD: z.coerce
        .number()
        .min(0)
        .max(1)
        .default(0.7),

    MAX_HISTORY_TURNS: z.coerce
        .number()
        .int()
        .positive()
        .default(6),

    MAX_HISTORY_TOKENS: z.coerce
        .number()
        .int()
        .positive()
        .default(3000),

    CHUNK_SIZE: z.coerce.number().int().positive().default(1000),

    CHUNK_OVERLAP: z.coerce.number().int().nonnegative().default(200),
});

export const env = envSchema.parse(process.env);