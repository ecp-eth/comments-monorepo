import type { Comment } from "@/lib/schemas";
import type { QueryKey } from "@tanstack/react-query";
import { createContext, useContext } from "react";
import type { Hex } from "viem";

export type OnDeleteCommentParams = {
  comment: Comment;
  /**
   * Query key to a query where comment is stored
   */
  queryKey: QueryKey;
};

export type OnRetryPostCommentParams = {
  comment: Comment;
  /**
   * Query key to a query where comment is stored
   */
  queryKey: QueryKey;
};

export type OnPostCommentParams<TExtra = unknown> = {
  comment: {
    author: Hex;
    parentId: Hex | undefined;
    content: string;
    targetUri: string;
  };
  /**
   * Query key to a query where comment is stored
   */
  queryKey: QueryKey;
  extra?: TExtra;
};

export type OnDeleteComment = (params: OnDeleteCommentParams) => Promise<void>;
export type OnRetryPostComment = (
  params: OnRetryPostCommentParams
) => Promise<void>;
export type OnPostComment<TExtra = unknown> = (
  params: OnPostCommentParams<TExtra>
) => Promise<void>;

export type CommentActionsContextType<TExtraPostComment = unknown> = {
  deleteComment: OnDeleteComment;
  postComment: OnPostComment<TExtraPostComment>;
  retryPostComment: OnRetryPostComment;
};

export const CommentActionsContext =
  createContext<CommentActionsContextType | null>(null);

export function CommentActionsProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: CommentActionsContextType;
}) {
  return (
    <CommentActionsContext.Provider value={value}>
      {children}
    </CommentActionsContext.Provider>
  );
}

export function useCommentActions<
  TExtraPostComment = unknown,
>(): CommentActionsContextType<TExtraPostComment> {
  const context = useContext(CommentActionsContext);

  if (!context) {
    throw new Error(
      "useCommentActions must be used within a CommentActionsProvider"
    );
  }

  return context;
}
