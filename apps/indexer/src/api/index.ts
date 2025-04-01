import { db } from "ponder:api";
import schema from "ponder:schema";
import { cors } from "hono/cors";
import { client, graphql } from "ponder";
import { OpenAPIHono } from "@hono/zod-openapi";
import setupRestAPI from "./setupRestAPI";
import { HTTPException } from "hono/http-exception";

const app = new OpenAPIHono();

app.onError((err) => {
  if (err instanceof HTTPException) {
    // Get the custom response
    return err.getResponse();
  }

  return Response.json({ message: "Internal server error" }, { status: 500 });
});

app.use("/sql/*", client({ db, schema }));
app.use("/", graphql({ db, schema }));
app.use("/graphql", graphql({ db, schema }));

// all apis are cors: * enabled
app.use(
  "/api/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowHeaders: ["*"],
    exposeHeaders: ["*"],
    credentials: true,
    maxAge: 86400,
  })
);

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
