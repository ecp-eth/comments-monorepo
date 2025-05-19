import type { Comment } from "@ecp.eth/shared/schemas";
import type { QueryKey } from "@tanstack/react-query";
import { createContext, useContext } from "react";
import type { Hex } from "viem";

export type OnDeleteCommentParams = {
  comment: Comment;
  /**
   * Query key to a query where comment is stored
   */
  queryKey: QueryKey;
  /**
   * Called when transaction was created.
   */
  onStart?: () => void;
};

export type OnRetryPostCommentParams = {
  comment: Comment;
  /**
   * Query key to a query where comment is stored
   */
  queryKey: QueryKey;
  /**
   * Called when transaction was created.
   */
  onStart?: () => void;
};

export type OnPostCommentParams<TExtra = unknown> = {
  address: Hex;
  comment:
    | {
        // reply doesn't need targetUri
        author: Hex;
        parentId: Hex;
        content: string;
      }
    | {
        author: Hex;
        content: string;
        targetUri: string;
      };
  /**
   * Query key to a query where comment is stored
   */
  queryKey: QueryKey;
  /**
   * Extra data to be passed to post comment
   */
  extra?: TExtra;
  /**
   * Called when transaction was created.
   */
  onStart?: () => void;
};

export type OnEditCommentParams<TExtra = unknown> = {
  address: Hex;
  /**
   * Original comment
   */
  comment: Comment;
  edit: {
    /**
     * Updated Comment content
     */
    content: string;
    /**
     * Updated Comment metadata
     */
    metadata: string;
  };
  /**
   * Query key to a query where comment is stored
   */
  queryKey: QueryKey;
  /**
   * Extra data to be passed to edit comment
   */
  extra?: TExtra;
  /**
   * Called when transaction was created.
   */
  onStart?: () => void;
};

export type OnRetryEditCommentParams = {
  comment: Comment;
  /**
   * Query key to a query where comment is stored
   */
  queryKey: QueryKey;
  /**
   * Called when transaction was created.
   */
  onStart?: () => void;
};

export type OnRetryEditComment = (
  params: OnRetryEditCommentParams
) => Promise<void>;

export type OnDeleteComment = (params: OnDeleteCommentParams) => Promise<void>;
export type OnRetryPostComment = (
  params: OnRetryPostCommentParams
) => Promise<void>;
export type OnPostComment<TExtra = unknown> = (
  params: OnPostCommentParams<TExtra>
) => Promise<void>;
export type OnEditComment = (params: OnEditCommentParams) => Promise<void>;
export type CommentActionsContextType<TExtraPostComment = unknown> = {
  deleteComment: OnDeleteComment;
  postComment: OnPostComment<TExtraPostComment>;
  retryPostComment: OnRetryPostComment;
  editComment: OnEditComment;
  retryEditComment: OnRetryEditComment;
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
