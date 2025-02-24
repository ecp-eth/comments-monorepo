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
