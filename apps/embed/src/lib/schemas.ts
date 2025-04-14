import { z } from "zod";
import { EmbedConfigSchema, HexSchema } from "@ecp.eth/sdk/schemas";
import { CommentDataWithIdSchema } from "@ecp.eth/shared/schemas";
import { MAX_COMMENT_LENGTH } from "./constants";
import { decompressFromURI } from "lz-ts";
// import { isProfane } from "./profanity-detection";

const sharedCommentSchema = z.object({
  author: HexSchema,
  // replace with following line to enable basic profanity detection
  content: z.string().trim().nonempty().max(MAX_COMMENT_LENGTH),
  /* content: z
    .string()
    .trim()
    .nonempty()
    .max(MAX_COMMENT_LENGTH)
    .refine((val) => !isProfane(val), "Comment contains profanity"), */
  chainId: z.number(),
});

export const SignCommentPayloadRequestSchema = z.union([
  sharedCommentSchema.extend({
    targetUri: z.string().url(),
  }),
  sharedCommentSchema.extend({
    parentId: HexSchema,
  }),
]);

export type SignCommentPayloadRequestSchemaType = z.infer<
  typeof SignCommentPayloadRequestSchema
>;

/**
 * Parses output from API endpoint
 */
export const SignCommentResponseServerSchema = z.object({
  signature: HexSchema,
  hash: HexSchema,
  data: CommentDataWithIdSchema,
});

export const EmbedConfigFromSearchParamsSchema = z.preprocess((value) => {
  try {
    if (typeof value === "string") {
      return JSON.parse(decompressFromURI(value));
    }
  } catch (err) {
    console.warn("failed to parse config", err);
  }
}, EmbedConfigSchema.default({}));
