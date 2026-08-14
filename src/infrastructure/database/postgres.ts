import { Pool } from "pg";
import { env } from "../../config/env.js";

export const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
});

export async function checkDatabaseConnection(): Promise<boolean> {
    try {
        await pool.query("SELECT 1");
        return true;
    } catch {
        return false;
    }
}