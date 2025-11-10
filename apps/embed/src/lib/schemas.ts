import { z } from "zod";
import { decompressFromURI } from "lz-ts";
import { EmbedConfigSchema } from "@ecp.eth/sdk/embed/schemas";

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
 * Embed config from search params
 */
export const EmbedConfigFromSearchParamsSchema = z.preprocess((value) => {
  try {
    if (typeof value === "string") {
      return JSON.parse(decompressFromURI(value));
    }
  } catch (err) {
    console.warn("failed to parse config", err);
  }
}, EmbedConfigSchema.default({}));
