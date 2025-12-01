import { cors } from "hono/cors";
import { OpenAPIHono } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import * as Sentry from "@sentry/node";
import { initializeRoutes } from "./routes";

const app = new OpenAPIHono();

// Add logging middleware
app.use("*", async (c, next) => {
  const startTime = Date.now();
  const method = c.req.method;
  const path = c.req.path;

  // Wait for the response
  await next();

  const endTime = Date.now();
  const duration = endTime - startTime;
  const status = c.res.status;

  // Use a distinct prefix for API logs to separate from Ponder logs
  console.log(`[API] ${method} ${path} ${status} ${duration}ms`);
});

app.onError((err, c) => {
  if (process.env.NODE_ENV !== "production") {
    console.error(err);
  }

  // Capture error in Sentry
  Sentry.captureException(err, {
    extra: {
      path: c.req.path,
      method: c.req.method,
    },
  });

  if (err instanceof HTTPException) {
    // Get the custom response
    return err.getResponse();
  }

  return Response.json({ message: "Internal server error" }, { status: 500 });
});

// all apis are cors: * enabled
app.use(
  "/api/*",
  cors({
    origin: "*",
    allowHeaders: ["Authorization", "Content-Type"],
    allowMethods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

await initializeRoutes(app);

export default app;
