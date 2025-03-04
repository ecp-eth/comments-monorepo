import { OpenAPIHono } from "@hono/zod-openapi";
import { db } from "ponder:api";

/**
 * Setup Health check
 *
 * @param app - The Hono app instance
 * @returns hono app instance
 */
export default (app: OpenAPIHono) => {
  app.get("/api/health", async (c) => {
    await db.query.comment.findFirst();

    return c.json({
      status: "ok",
    });
  });

  return app;
};
