import { db } from "ponder:api";
import schema from "ponder:schema";
import { cors } from "hono/cors";
import { client, graphql } from "ponder";
import { OpenAPIHono } from "@hono/zod-openapi";
import setupRestAPI from "./setupRestAPI";
import { HTTPException } from "hono/http-exception";
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { env } from "../env";

// Initialize Sentry
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    integrations: [
      // Enable profiling integration
      nodeProfilingIntegration(),
    ],
    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: 1.0,
    // Set profilesSampleRate to 1.0 to profile 100%
    // of sampled transactions.
    // We recommend adjusting this value in production
    profilesSampleRate: 1.0,
  });
}

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
  if (err instanceof HTTPException) {
    // Get the custom response
    return err.getResponse();
  }

  // Capture error in Sentry
  if (env.SENTRY_DSN) {
    Sentry.captureException(err, {
      extra: {
        path: c.req.path,
        method: c.req.method,
      },
    });
  }

  return Response.json({ message: "Internal server error" }, { status: 500 });
});

app.use("/sql/*", client({ db, schema }));
app.use("/", graphql({ db, schema }));
app.use("/graphql", graphql({ db, schema }));

// all apis are cors: * enabled
app.use("/api/*", cors());

// The OpenAPI documentation will be available at /docs
app.doc("/docs", {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "Ethereum comments protocol indexer API",
  },
});

setupRestAPI(app);

export default app;
