import { FastifyInstance } from "fastify";

import { askQuestion } from "./rag.service.js";

export async function ragRoutes(app: FastifyInstance) {
    app.post("/query", async (request, reply) => {
        const body = request.body as {
            tenantId?: unknown;
            question?: unknown;
        };

        if (
            typeof body?.tenantId !== "string" ||
            !body.tenantId.trim()
        ) {
            return reply.status(400).send({
                error: "tenantId is required",
            });
        }

        if (
            typeof body?.question !== "string" ||
            !body.question.trim()
        ) {
            return reply.status(400).send({
                error: "question is required",
            });
        }

        try {
            const result = await askQuestion({
                tenantId: body.tenantId.trim(),
                question: body.question.trim(),
            });

            return reply.status(200).send(result);
        } catch (error) {
            request.log.error(error);

            return reply.status(500).send({
                error: "Failed to answer question",
            });
        }
    });
}
