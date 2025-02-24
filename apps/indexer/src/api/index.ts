import { db } from "ponder:api";
import schema from "ponder:schema";
import { cors } from "hono/cors";
import { client, graphql } from "ponder";
import { OpenAPIHono } from '@hono/zod-openapi'
import setupRestAPI from "./setupRestAPI";

// this is to bypass the ponder check for hono instance.
// see: https://github.com/ponder-sh/ponder/issues/1551
class Hono extends OpenAPIHono {
}

const app = new Hono();

app.use("/sql/*", client({ db, schema }));
app.use("/", graphql({ db, schema }));
app.use("/graphql", graphql({ db, schema }));

// all apis are cors: * enabled
app.use("/api/*", cors());

// The OpenAPI documentation will be available at /docs
app.doc('/docs', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'Ethereum comments protocol indexer API',
  },
})

setupRestAPI(app)

export default app;
