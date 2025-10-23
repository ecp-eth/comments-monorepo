import {
  IndexerAPIAuthorDataSchema,
  IndexerAPICommentReferencesSchema,
  IndexerAPICommentZeroExSwapSchema,
} from "@ecp.eth/sdk/indexer/schemas";
import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import { z } from "zod";
import { SignCommentResponseClientSchema } from "./sign-comment";
import { SignEditCommentResponseClientSchema } from "./sign-edit-comment";

export const PendingOperationTypeSchema = z.enum([
  "gasless-not-preapproved",
  "gasless-preapproved",
  "non-gasless",
]);

export type PendingOperationTypeSchemaType = z.infer<
  typeof PendingOperationTypeSchema
>;

export const PendingPostCommentOperationSchema = z.object({
  type: PendingOperationTypeSchema,
  action: z.literal("post"),
  txHash: HexSchema,
  chainId: z.number().positive().int(),
  response: SignCommentResponseClientSchema,
  resolvedAuthor: IndexerAPIAuthorDataSchema.optional(),
  zeroExSwap: IndexerAPICommentZeroExSwapSchema.optional(),
  state: z.discriminatedUnion("status", [
    z.object({
      status: z.literal("pending"),
    }),
    z.object({
      status: z.literal("success"),
    }),
    z.object({
      status: z.literal("error"),
      error: z.instanceof(Error),
    }),
  ]),
  references: IndexerAPICommentReferencesSchema,
});

export type PendingPostCommentOperationSchemaType = z.infer<
  typeof PendingPostCommentOperationSchema
>;

export const PendingEditCommentOperationSchema = z.object({
  type: PendingOperationTypeSchema,
  action: z.literal("edit"),
  txHash: HexSchema,
  chainId: z.number().positive().int(),
  response: SignEditCommentResponseClientSchema,
  state: z.discriminatedUnion("status", [
    z.object({
      status: z.literal("pending"),
    }),
    z.object({
      status: z.literal("success"),
    }),
    z.object({
      status: z.literal("error"),
      error: z.instanceof(Error),
    }),
  ]),
  references: IndexerAPICommentReferencesSchema,
});

export type PendingEditCommentOperationSchemaType = z.infer<
  typeof PendingEditCommentOperationSchema
>;

export const PendingDeleteCommentOperationSchema = z.object({
  type: PendingOperationTypeSchema,
  action: z.literal("delete"),
  commentId: HexSchema,
  txHash: HexSchema,
  chainId: z.number().positive().int(),
  state: z.discriminatedUnion("status", [
    z.object({
      status: z.literal("pending"),
    }),
    z.object({
      status: z.literal("success"),
    }),
    z.object({
      status: z.literal("error"),
      error: z.instanceof(Error),
    }),
  ]),
});

export type PendingDeleteCommentOperationSchemaType = z.infer<
  typeof PendingDeleteCommentOperationSchema
>;

export const PendingCommentOperationSchema = z.discriminatedUnion("action", [
  PendingPostCommentOperationSchema,
  PendingDeleteCommentOperationSchema,
  PendingEditCommentOperationSchema,
]);

export type PendingCommentOperationSchemaType = z.infer<
  typeof PendingCommentOperationSchema
>;
