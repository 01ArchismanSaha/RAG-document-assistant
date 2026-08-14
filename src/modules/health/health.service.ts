import { checkDatabaseConnection } from "../../infrastructure/database/postgres.js";

export async function getHealth() {
    const database = await checkDatabaseConnection();

    return {
        status: database ? "ok" : "degraded",
        database: database ? "up" : "down",
    };
}