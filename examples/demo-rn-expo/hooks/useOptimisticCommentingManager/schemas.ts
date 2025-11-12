import {
  IndexerAPICommentWithRepliesSchema,
  IndexerAPIListCommentRepliesSchema,
  IndexerAPIListCommentsSchema,
  IndexerAPIListCommentsSchemaType,
} from "@ecp.eth/sdk/indexer/schemas";
import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import { SignPostCommentResponseBodySchema } from "@ecp.eth/shared-signer/schemas/signer-api/post";
import { z } from "zod";

export const PendingCommentOperationSchema = z
  .object({
    txHash: HexSchema,
    chainId: z.number().positive().int(),
    response: SignPostCommentResponseBodySchema,
  })
  .describe(
    "Contains information about pending operation so we can show that in comment list",
  );

export type PendingCommentOperationSchemaType = z.infer<
  typeof PendingCommentOperationSchema
>;

/**
 * A object with an attached property to indicate the parent object is a pending operation
 */
export const PendingOperationSchema = z
  .object({
    pendingType: z.enum(["insert", "delete"]).optional(),
  })
  .describe(
    "A object with an attached property to indicate the parent object is a pending operation",
  );

export type PendingOperationSchemaType = z.infer<typeof PendingOperationSchema>;

export const IndexerAPICommentWithPendingOperationSchema =
  IndexerAPICommentWithRepliesSchema.extend(PendingOperationSchema.shape);

export type IndexerAPICommentWithPendingOperationSchemaType = z.infer<
  typeof IndexerAPICommentWithPendingOperationSchema
>;

export const IndexerAPIListCommentsWithPendingOperationsSchema = z.object({
  ...IndexerAPIListCommentsSchema.shape,
  results: z.array(
    IndexerAPICommentWithRepliesSchema.extend(PendingOperationSchema.shape),
  ),
});

export type IndexerAPIListCommentsWithPendingOperationsSchemaType = z.infer<
  typeof IndexerAPIListCommentsWithPendingOperationsSchema
>;

export const FetchCommentInfinityPageParamSchema = z.object({
  cursor: HexSchema.optional(),
  limit: z.number().positive().int(),
});

export type FetchCommentInfinityPageParamSchemaType = z.infer<
  typeof FetchCommentInfinityPageParamSchema
>;

export const FetchCommentInfinityQuerySchema = z.object({
  pageParams: z.array(FetchCommentInfinityPageParamSchema),
  pages: z.array(
    z.union([IndexerAPIListCommentsSchema, IndexerAPIListCommentRepliesSchema]),
  ),
});

export type FetchCommentInfinityQuerySchemaType = z.infer<
  typeof FetchCommentInfinityQuerySchema
>;

type Optionalize<T, K extends keyof T> = Omit<T, K> & {
  [P in K]?: T[P];
};

type ResultsType = IndexerAPIListCommentsSchemaType["results"];
type ResultType = ResultsType[number];
export type IndexerAPIListCommentsSchemaTypeWithOptionalResultsReplies = Omit<
  IndexerAPIListCommentsSchemaType,
  "results"
> & {
  results: Optionalize<ResultType, "replies">[];
};
