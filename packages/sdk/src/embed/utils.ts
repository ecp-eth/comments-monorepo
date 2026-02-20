import * as lz from "lz-ts";
import type { Hex } from "../core/schemas.js";
import {
  EmbedConfigSchema,
  type EmbedConfigSchemaOutputType,
  type EmbedConfigSchemaInputType,
} from "./schemas/index.js";

const { compressToURI, decompressFromURI } = lz;
const lzCompat = lz as unknown as {
  compressToURI?: (input: string) => string;
  decompressFromURI?: (input: string) => string;
  default?: {
    compressToURI?: (input: string) => string;
    decompressFromURI?: (input: string) => string;
  };
  "module.exports"?: {
    compressToURI?: (input: string) => string;
    decompressFromURI?: (input: string) => string;
  };
};

const compressToURICompat =
  compressToURI ??
  lzCompat.compressToURI ??
  lzCompat.default?.compressToURI ??
  lzCompat["module.exports"]?.compressToURI;

const decompressFromURICompat =
  decompressFromURI ??
  lzCompat.decompressFromURI ??
  lzCompat.default?.decompressFromURI ??
  lzCompat["module.exports"]?.decompressFromURI;

/**
 * Parameters for `createCommentsEmbedURL`
 */
export type CreateCommentsEmbedURLParams = {
  /**
   * The URI of the comments embed iframe page.
   */
  embedUri: string;
  /**
   * The target URI, author address, or comment ID to embed comments for.
   */
  source:
    | { targetUri: string }
    | { author: Hex }
    | { commentId: Hex }
    | { channelId: string | bigint };
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

  if ("targetUri" in source && !!URL.parse(source.targetUri)) {
    url.searchParams.set("targetUri", source.targetUri);
  } else if ("author" in source) {
    url.searchParams.set("author", source.author);
  } else if ("commentId" in source) {
    url.searchParams.set("commentId", source.commentId);
  } else if ("channelId" in source) {
    const channelId = normalizeSourceChannelId(source.channelId);
    if (!channelId) {
      throw new Error("Invalid source");
    }

    url.searchParams.set("channelId", channelId);
  } else {
    throw new Error("Invalid source");
  }

  if (config && EmbedConfigSchema.parse(config)) {
    if (!compressToURICompat) {
      throw new Error("Failed to compress config");
    }

    url.searchParams.set(
      "config",
      compressToURICompat(
        JSON.stringify(config, (_key, value) =>
          typeof value === "bigint" ? value.toString() : value,
        ),
      ),
    );
  }

  return url.toString();
}

function normalizeSourceChannelId(
  value: string | bigint | null | undefined,
): string | undefined {
  if (value == null) {
    return;
  }

  const channelId = typeof value === "bigint" ? value.toString() : value.trim();
  if (!channelId || !/^\d+$/.test(channelId)) {
    return;
  }

  return channelId;
}

/**
 * Parse compressed config from `config` search param.
 *
 * @returns Parsed config or `undefined` when parsing fails.
 */
export function parseCommentsEmbedConfig(
  compressedConfig: string,
): EmbedConfigSchemaOutputType | undefined {
  try {
    const decompressed = decompressFromURICompat?.(compressedConfig);

    if (!decompressed) {
      return;
    }

    return EmbedConfigSchema.parse(JSON.parse(decompressed));
  } catch {
    return;
  }
}
