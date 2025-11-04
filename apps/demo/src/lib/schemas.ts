import { z } from "zod";
import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import { IndexerSIWEVerifyResponseBodySchema } from "@ecp.eth/shared/schemas/indexer-siwe-api/verify";

export const GenerateUploadUrlResponseSchema = z.object({
  url: z.string().url(),
});

export type GenerateUploadUrlResponseSchemaType = z.infer<
  typeof GenerateUploadUrlResponseSchema
>;

export const BadRequestResponseSchema = z.record(
  z.string(),
  z.string().array(),
);

export const InternalServerErrorResponseSchema = z.object({
  error: z.string(),
});

export const SIWETokensSchema = IndexerSIWEVerifyResponseBodySchema.extend({
  address: HexSchema,
});
export type SIWETokens = z.output<typeof SIWETokensSchema>;
