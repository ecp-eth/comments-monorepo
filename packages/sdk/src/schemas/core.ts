import { z } from "zod";
import { EMPTY_PARENT_ID } from "../constants.js";

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
 * The base schema for a comment.
 */
const BaseCommentDataSchema = z.object({
  content: z.string(),
  metadata: z.string(),
  targetUri: z.string(),
  parentId: HexSchema,
  author: HexSchema,
  appSigner: HexSchema,
  nonce: z.coerce.bigint(),
  deadline: z.coerce.bigint(),
});

/**
 * Refines a comment schema to ensure proper validation
 *
 * This function is useful when you want to extend BaseCommentSchema with extra properties
 * and also have a validation on parentId and targetUri
 *
 * @example
 * ```ts
 * import { CommentDataSchema, refineCommentSchema } from "@ecp.eth/sdk/schemas";
 *
 * const ExtendedCommentDataSchema = CommentDataSchema._def.schema.extend({
 *   extraProperty: z.string(),
 * });
 *
 * export const ExtendedCommentDataSchema = refineCommentSchema(ExtendedCommentDataSchema);
 * ```
 */
export function refineCommentSchema<
  TSchemaShape extends typeof BaseCommentDataSchema.shape,
>(schema: z.ZodObject<TSchemaShape>) {
  return schema.superRefine((value, ctx) => {
    const hasParentId = value.parentId !== EMPTY_PARENT_ID;
    const hasTargetUri = value.targetUri !== "";

    if (hasParentId && hasTargetUri) {
      ctx.addIssue({
        code: "too_big",
        path: ["targetUri"],
        maximum: 0,
        inclusive: false,
        type: "string",
        message: "Target URI must be empty for replies",
      });

      ctx.addIssue({
        code: "too_big",
        path: ["parentId"],
        maximum: 0,
        inclusive: false,
        type: "string",
        message: "Parent ID must be empty for root comments",
      });

      return z.NEVER;
    }

    if (hasTargetUri) {
      const result = z.string().url().safeParse(value.targetUri);

      if (!result.success) {
        ctx.addIssue({
          code: "custom",
          path: ["targetUri"],
          message: "Target URI must be a valid URL",
        });

        return z.NEVER;
      }
    }
  });
}

/**
 * The data structure of a comment. For details, see [CommentData](/comment-data-props).
 * @see [CommentData](/comment-data-props)
 */
export const CommentDataSchema = refineCommentSchema(BaseCommentDataSchema);
export type CommentData = z.infer<typeof CommentDataSchema>;
