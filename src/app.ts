import Fastify from "fastify";
import multipart from "@fastify/multipart";

import { healthRoutes } from "./modules/health/health.routes.js";
import { documentRoutes } from "./modules/documents/document.routes.js";
import { ragRoutes } from "./modules/rag/rag.routes.js";

export function buildApp() {
    const app = Fastify({
        logger: true,
    });

    app.register(multipart);

    app.register(healthRoutes);
    app.register(documentRoutes);
    app.register(ragRoutes);

    return app;
}