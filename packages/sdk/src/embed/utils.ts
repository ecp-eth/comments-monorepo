import * as lz from "lz-ts";
import type { Hex } from "../core/schemas.js";
import {
  EmbedConfigSchema,
  type EmbedConfigSchemaInputType,
} from "./schemas/index.js";

const { compressToURI } = lz;

/**
 * Parameters for `createCommentsEmbedURL`
 */
export type CreateCommentsEmbedURLParams = {
  /**
   * The URI of the comments embed iframe page.
   */
  embedUri: string;
  /**
   * The target URI or author address to embed comments for.
   */
  source: { targetUri: string } | { author: Hex };
  /**
   * The configuration for the comments embed.
   */
  config?: EmbedConfigSchemaInputType;
};

/**
 * Creates a URL for the comments embed iframe.
 *
 * @param options
 *
 * @returns The URL for the comments embed iframe.
 */
export function createCommentsEmbedURL({
  embedUri,
  source,
  config,
}: CreateCommentsEmbedURLParams): string {
  const url = new URL(embedUri);

  if ("targetUri" in source) {
    url.searchParams.set("targetUri", source.targetUri);
  } else {
    url.searchParams.set("author", source.author);
  }

  if (config && EmbedConfigSchema.parse(config)) {
    url.searchParams.set("config", compressToURI(JSON.stringify(config)));
  }

  return url.toString();
}
