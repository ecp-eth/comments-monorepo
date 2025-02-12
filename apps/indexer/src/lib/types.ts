import type { CommentSelectType } from "ponder:schema";

export type APIComment = CommentSelectType & {
  replies: APIListCommentsResponse;
};

export type APIPaginationInfo = {
  offset: number;
  limit: number;
  hasMore: boolean;
};

export type APIListCommentsResponse = {
  results: APIComment[];
  pagination: APIPaginationInfo;
};
