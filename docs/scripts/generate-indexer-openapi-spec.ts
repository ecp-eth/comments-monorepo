/**
 * This script generates the OpenAPI specification for the Indexer Restful API,
 * by using the `@hono/zod-openapi` plugin.
 *
 * In order to instantiate the Hono app with all rest api handler, because 
 * the handlers are using ponder specific modules, such as 'ponder:schema' and 'ponder:api',
 * which are not available directly in currrent context, we will need to use the mock
 * module register and loader, to return a mocked module to allow the instantiation step to 
 * pass through.
 */
import * as yaml from 'js-yaml';
import { writeFileSync } from 'node:fs';
import { OpenAPIHono } from "@hono/zod-openapi";
import setupRestAPI from '@ecp.eth/indexer/src/api/setupRestAPI';

const app = new OpenAPIHono();

setupRestAPI(app);

// Convert the OpenAPIObject to a YAML string
const yamlString = yaml.dump(app.getOpenAPI31Document({
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'Indexer Restful API',
  },
  servers: [
    {
      url: 'https://api.ethcomments.xyz',
      description: 'Production Indexer API',
    },
  ],
}));

// Save the YAML string to a file
writeFileSync('public/indexer-openapi.yaml', yamlString);
