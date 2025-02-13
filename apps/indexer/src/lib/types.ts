import type { CommentSelectType } from "ponder:schema";
import { Hex } from "viem";

export type APIComment = Omit<CommentSelectType, "author"> & {
  replies: APIListCommentsResponse;
  /**
   * Null in case author is removed
   */
  author: null | {
    address: Hex;
    ens?: {
      name: string;
      avatarUrl: string | null;
    };
  };
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
