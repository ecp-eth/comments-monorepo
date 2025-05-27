import { z } from "zod";
import { HexSchema } from "../core/schemas.js";
import { DOMAIN_NAME, DOMAIN_VERSION } from "./eip712.js";
import {
  DEFAULT_CHANNEL_ID,
  DEFAULT_COMMENT_TYPE,
  EMPTY_PARENT_ID,
} from "../constants.js";
import type {
  CommentData,
  CreateReplyCommentDataParams,
  CreateRootCommentDataParams,
  Json,
  JsonObject,
} from "./types.js";

export const JsonLiteralSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const JsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([JsonLiteralSchema, z.array(JsonSchema), z.record(JsonSchema)]),
);

export const JsonObjectSchema: z.ZodType<JsonObject> = z.record(
  z.string(),
  JsonSchema,
);

export const CommentMetadataSchema = z.string().refine(
  (val) => {
    if (!val) {
      return true;
    }

    try {
      const parsedValue = JSON.parse(val);

      const parsedValueSchema = JsonObjectSchema.safeParse(parsedValue);

      if (!parsedValueSchema.success) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  },
  {
    message: "Invalid JSON, expecting object",
  },
);

export const CommentDataSchema = z.object({
  author: HexSchema,
  app: HexSchema,

  channelId: z.coerce.bigint(),
  nonce: z.coerce.bigint(),
  deadline: z.coerce.bigint(),
  parentId: HexSchema,

  content: z.string(),
  metadata: CommentMetadataSchema,
  targetUri: z.string(),
  commentType: z.string(),

  createdAt: z.coerce.bigint(),
  updatedAt: z.coerce.bigint(),

  hookData: z.string(),
});

// this just tests if the shape is correct
({}) as z.infer<typeof CommentDataSchema> satisfies CommentData;

export const CreateCommentDataSchema = CommentDataSchema.omit({
  createdAt: true,
  updatedAt: true,
});

export type CreateCommentData = z.infer<typeof CreateCommentDataSchema>;

const BaseCommentInputDataSchema = z.object({
  author: HexSchema,
  app: HexSchema,

  channelId: z.bigint().default(DEFAULT_CHANNEL_ID),
  nonce: z.bigint(),
  deadline: z.bigint(),
  parentId: HexSchema,

  content: z.string(),
  metadata: CommentMetadataSchema,
  targetUri: z.string(),
  commentType: z.string().default(DEFAULT_COMMENT_TYPE),

  hookData: z.string().default(""),
});

export const RootCommentInputDataSchema = BaseCommentInputDataSchema.omit({
  targetUri: true,
  parentId: true,
}).extend({
  targetUri: z.string(),
  parentId: z.literal(EMPTY_PARENT_ID),
});

// this just tests if the shape is correct
({}) as z.infer<typeof RootCommentInputDataSchema> satisfies Omit<
  CreateRootCommentDataParams,
  "metadata"
>;

export const ReplyCommentInputDataSchema = BaseCommentInputDataSchema.omit({
  targetUri: true,
}).extend({
  targetUri: z.literal(""),
});

// this just tests if the shape is correct
({}) as z.infer<typeof ReplyCommentInputDataSchema> satisfies Omit<
  CreateReplyCommentDataParams,
  "metadata"
>;

/**
 * Comment input data schema. This is used as input of the functions.
 *
 * It validates precisely what shapes we expect in case of a comment or a reply.
 */
export const CommentInputDataSchema = z.union([
  RootCommentInputDataSchema,
  ReplyCommentInputDataSchema,
]);

export type CommentInputData = z.infer<typeof CommentInputDataSchema>;

// this is just for type checking
({}) as CommentInputData satisfies CreateCommentData;

/**
 * Edit comment data schema. This is used as input of the functions.
 */
export const EditCommentDataSchema = z.object({
  commentId: HexSchema,
  content: z.string(),
  metadata: CommentMetadataSchema,
  app: HexSchema,
  nonce: z.coerce.bigint(),
  deadline: z.coerce.bigint(),
});

export type EditCommentData = z.infer<typeof EditCommentDataSchema>;

export const AddCommentTypedDataSchema = z.object({
  primaryType: z.literal("AddComment"),
  domain: z.object({
    name: z.literal(DOMAIN_NAME),
    version: z.literal(DOMAIN_VERSION),
    chainId: z.number(),
    verifyingContract: HexSchema,
  }),
  message: CreateCommentDataSchema,
  types: z.object({
    AddComment: z.array(
      z.union([
        z.object({ name: z.literal("content"), type: z.literal("string") }),
        z.object({ name: z.literal("metadata"), type: z.literal("string") }),
        z.object({ name: z.literal("targetUri"), type: z.literal("string") }),
        z.object({ name: z.literal("commentType"), type: z.literal("string") }),
        z.object({ name: z.literal("author"), type: z.literal("address") }),
        z.object({ name: z.literal("app"), type: z.literal("address") }),
        z.object({ name: z.literal("channelId"), type: z.literal("uint256") }),
        z.object({ name: z.literal("nonce"), type: z.literal("uint256") }),
        z.object({ name: z.literal("deadline"), type: z.literal("uint256") }),
        z.object({ name: z.literal("parentId"), type: z.literal("bytes32") }),
      ]),
    ),
  }),
});

export type AddCommentTypedDataSchemaType = z.infer<
  typeof AddCommentTypedDataSchema
>;

export const DeleteCommentTypedDataSchema = z.object({
  primaryType: z.literal("DeleteComment"),
  domain: z.object({
    name: z.literal(DOMAIN_NAME),
    version: z.literal(DOMAIN_VERSION),
    chainId: z.number(),
    verifyingContract: HexSchema,
  }),
  message: z.object({
    commentId: HexSchema,
    app: HexSchema,
    author: HexSchema,
    deadline: z.coerce.bigint(),
    nonce: z.coerce.bigint(),
  }),
  types: z.object({
    DeleteComment: z.array(
      z.union([
        z.object({ name: z.literal("commentId"), type: z.literal("bytes32") }),
        z.object({ name: z.literal("author"), type: z.literal("address") }),
        z.object({ name: z.literal("app"), type: z.literal("address") }),
        z.object({ name: z.literal("nonce"), type: z.literal("uint256") }),
        z.object({ name: z.literal("deadline"), type: z.literal("uint256") }),
      ]),
    ),
  }),
});

export type DeleteCommentTypedDataSchemaType = z.infer<
  typeof DeleteCommentTypedDataSchema
>;

export const EditCommentTypedDataSchema = z.object({
  primaryType: z.literal("EditComment"),
  domain: z.object({
    name: z.literal(DOMAIN_NAME),
    version: z.literal(DOMAIN_VERSION),
    chainId: z.number(),
    verifyingContract: HexSchema,
  }),
  message: z.object({
    commentId: HexSchema,
    content: z.string(),
    metadata: CommentMetadataSchema,
    author: HexSchema,
    app: HexSchema,
    nonce: z.coerce.bigint(),
    deadline: z.coerce.bigint(),
  }),
  types: z.object({
    EditComment: z.array(
      z.union([
        z.object({ name: z.literal("commentId"), type: z.literal("bytes32") }),
        z.object({ name: z.literal("content"), type: z.literal("string") }),
        z.object({ name: z.literal("metadata"), type: z.literal("string") }),
        z.object({ name: z.literal("author"), type: z.literal("address") }),
        z.object({ name: z.literal("app"), type: z.literal("address") }),
        z.object({ name: z.literal("nonce"), type: z.literal("uint256") }),
        z.object({ name: z.literal("deadline"), type: z.literal("uint256") }),
      ]),
    ),
  }),
});

export type EditCommentTypedDataSchemaType = z.infer<
  typeof EditCommentTypedDataSchema
>;

export const AddApprovalTypedDataSchema = z.object({
  primaryType: z.literal("AddApproval"),
  domain: z.object({
    name: z.literal(DOMAIN_NAME),
    version: z.literal(DOMAIN_VERSION),
    chainId: z.number(),
    verifyingContract: HexSchema,
  }),
  message: z.object({
    author: HexSchema,
    app: HexSchema,
    nonce: z.coerce.bigint(),
    deadline: z.coerce.bigint(),
  }),
  types: z.object({
    AddApproval: z.array(
      z.union([
        z.object({ name: z.literal("author"), type: z.literal("address") }),
        z.object({ name: z.literal("app"), type: z.literal("address") }),
        z.object({ name: z.literal("nonce"), type: z.literal("uint256") }),
        z.object({ name: z.literal("deadline"), type: z.literal("uint256") }),
      ]),
    ),
  }),
});

export type AddApprovalTypedDataSchemaType = z.infer<
  typeof AddApprovalTypedDataSchema
>;

export const RemoveApprovalTypedDataSchema = z.object({
  primaryType: z.literal("RemoveApproval"),
  domain: z.object({
    name: z.literal(DOMAIN_NAME),
    version: z.literal(DOMAIN_VERSION),
    chainId: z.number(),
    verifyingContract: HexSchema,
  }),
  message: z.object({
    author: HexSchema,
    app: HexSchema,
    nonce: z.coerce.bigint(),
    deadline: z.coerce.bigint(),
  }),
  types: z.object({
    RemoveApproval: z.array(
      z.union([
        z.object({ name: z.literal("author"), type: z.literal("address") }),
        z.object({ name: z.literal("app"), type: z.literal("address") }),
        z.object({ name: z.literal("nonce"), type: z.literal("uint256") }),
        z.object({ name: z.literal("deadline"), type: z.literal("uint256") }),
      ]),
    ),
  }),
});

export type RemoveApprovalTypedDataSchemaType = z.infer<
  typeof RemoveApprovalTypedDataSchema
>;
