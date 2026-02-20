import { z } from "zod";
import { EmbedConfigSchema } from "@ecp.eth/sdk/embed/schemas";
import { parseCommentsEmbedConfig } from "@ecp.eth/sdk/embed/utils";
import * as lz from "lz-ts";

const lzCompat = lz as unknown as {
  decompressFromURI?: (input: string) => string;
  default?: {
    decompressFromURI?: (input: string) => string;
  };
  "module.exports"?: {
    decompressFromURI?: (input: string) => string;
  };
};

function parseEmbedConfigFromSearchParam(value: string) {
  const candidates = [value];
  try {
    const decoded = decodeURIComponent(value);
    if (decoded !== value) {
      candidates.push(decoded);
    }
  } catch {
    // ignore malformed URI components
  }

  for (const candidate of candidates) {
    const parsedBySdk = parseCommentsEmbedConfig(candidate);
    if (parsedBySdk) {
      return parsedBySdk;
    }

    try {
      const decompressFromURI =
        lzCompat.decompressFromURI ??
        lzCompat.default?.decompressFromURI ??
        lzCompat["module.exports"]?.decompressFromURI;

      if (!decompressFromURI) {
        return;
      }

      const decompressed = decompressFromURI(candidate);
      if (!decompressed) {
        continue;
      }

      return EmbedConfigSchema.parse(JSON.parse(decompressed));
    } catch (err) {
      console.warn("failed to parse config", err);
    }
  }

  return;
}

export const BadRequestResponseSchema = z.record(
  z.string(),
  z.string().array(),
);

export const InternalServerErrorResponseSchema = z.object({
  error: z.string(),
});

export const GenerateUploadUrlResponseSchema = z.object({
  url: z.string().url(),
});

export type GenerateUploadUrlResponseSchemaType = z.infer<
  typeof GenerateUploadUrlResponseSchema
>;

/**
 * Some integrations pass iframe `src` copied from HTML with `&amp;config=...`,
 * which turns into a literal `amp;config` query key instead of `config`.
 * Normalize that key so config parsing still works.
 */
export function normalizeEmbedSearchParams(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const params = value as Record<string, unknown>;

  if (params.config != null) {
    return params;
  }

  if (params["amp;config"] != null) {
    const { "amp;config": ampConfig, ...rest } = params;
    return {
      ...rest,
      config: ampConfig,
    };
  }

  return params;
}

/**
 * Embed config from search params
 */
export const EmbedConfigFromSearchParamsSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    return parseEmbedConfigFromSearchParam(value);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item !== "string") {
        continue;
      }

      const parsed = parseEmbedConfigFromSearchParam(item);
      if (parsed) {
        return parsed;
      }
    }
  }
}, EmbedConfigSchema.default({}));
