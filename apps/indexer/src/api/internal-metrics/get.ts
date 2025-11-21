import { z, type OpenAPIHono } from "@hono/zod-openapi";
import { metrics } from "../../services/metrics";
import { HTTPException } from "hono/http-exception";

export function setupInternalMetricsGet(app: OpenAPIHono) {
  app.openapi(
    {
      method: "get",
      path: "/api/internal/metrics",
      tags: ["internal", "metrics"],
      description: "Get the internal metrics",
      responses: {
        200: {
          content: {
            "text/plain": {
              schema: z.string(),
            },
          },
          description: "The internal metrics",
        },
      },
    },
    async (c) => {
      try {
        const m = await metrics.getMetrics();

        return c.text(m, 200);
      } catch (error) {
        console.error(error);

        throw new HTTPException(500, {
          message: "Internal server error",
        });
      }
    },
  );
}
