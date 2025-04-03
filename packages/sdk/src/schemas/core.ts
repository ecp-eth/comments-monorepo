import { z } from "zod";

export const HexSchema = z.custom<`0x${string}`>(
  (value) =>
    z
      .string()
      .regex(/^0x[0-9a-fA-F]+$/)
      .safeParse(value).success
);

/**
 * type for hex format string, e.g. `0x1234567890abcdef`
 */
export type Hex = z.infer<typeof HexSchema>;

/**
 * The data structure of a comment. For details, see [CommentData](/comment-data-props).
 * @see [CommentData](/comment-data-props)
 */
export const CommentDataSchema = z.object({
  content: z.string(),
  metadata: z.string(),
  targetUri: z.string(),
  parentId: HexSchema,
  author: HexSchema,
  appSigner: HexSchema,
  nonce: z.coerce.bigint(),
  deadline: z.coerce.bigint(),
});

export type CommentData = {} & z.infer<typeof CommentDataSchema>;
