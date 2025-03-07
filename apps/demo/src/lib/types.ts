import type {
  IndexerAPICommentSchemaType,
  IndexerAPICommentWithRepliesSchemaType,
} from "@ecp.eth/sdk/schemas";

export type CommentType =
  | IndexerAPICommentSchemaType
  | IndexerAPICommentWithRepliesSchemaType;

export type AuthorType = CommentType["author"];
