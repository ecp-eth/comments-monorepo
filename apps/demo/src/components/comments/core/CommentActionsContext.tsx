import type { MetadataEntry } from "@ecp.eth/sdk/comments";
import type { IndexerAPICommentReferencesSchemaType } from "@ecp.eth/sdk/indexer/schemas";
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
  comment:
    | {
        // reply doesn't need targetUri
        author: Hex;
        parentId: Hex;
        content: string;
        metadata?: MetadataEntry[];
        references: IndexerAPICommentReferencesSchemaType;
      }
    | {
        author: Hex;
        content: string;
        targetUri: string;
        metadata?: MetadataEntry[];
        references: IndexerAPICommentReferencesSchemaType;
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
    metadata: MetadataEntry[];
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

export type OnLikeCommentParams = {
  /**
   * Comment to like
   */
  comment: Comment;
  /**
   * Query key to a query where comment is stored
   */
  queryKey: QueryKey;
  /**
   * Called before transaction was created.
   */
  onBeforeStart?: () => void;
  /**
   * Called when transaction was successful.
   */
  onSuccess?: () => void;
  /**
   * Called when transaction was failed.
   */
  onFailed?: (error: unknown) => void;
};

export type OnUnlikeCommentParams = {
  /**
   * Comment to unlike
   */
  comment: Comment;
  /**
   * Query key to a query where comment is stored
   */
  queryKey: QueryKey;
  /**
   * Called before transaction was created.
   */
  onBeforeStart?: () => void;
  /**
   * Called when transaction was failed.
   */
  onFailed?: (error: unknown) => void;
};

export type OnRetryEditComment = (
  params: OnRetryEditCommentParams,
) => Promise<void>;

export type OnDeleteComment = (params: OnDeleteCommentParams) => Promise<void>;
export type OnRetryPostComment = (
  params: OnRetryPostCommentParams,
) => Promise<void>;
export type OnPostComment<TExtra = unknown> = (
  params: OnPostCommentParams<TExtra>,
) => Promise<void>;
export type OnEditComment = (params: OnEditCommentParams) => Promise<void>;
export type OnLikeComment = (params: OnLikeCommentParams) => Promise<void>;
export type OnUnlikeComment = (params: OnUnlikeCommentParams) => Promise<void>;
export type CommentActionsContextType<TExtraPostComment = unknown> = {
  deleteComment: OnDeleteComment;
  postComment: OnPostComment<TExtraPostComment>;
  retryPostComment: OnRetryPostComment;
  editComment: OnEditComment;
  retryEditComment: OnRetryEditComment;
  likeComment: OnLikeComment;
  unlikeComment: OnUnlikeComment;
};

export const CommentActionsContext =
  createContext<CommentActionsContextType<any> | null>(null);

export function useCommentActions<
  TExtraPostComment = unknown,
>(): CommentActionsContextType<TExtraPostComment> {
  const context = useContext(CommentActionsContext);

  if (!context) {
    throw new Error(
      "useCommentActions must be used within a CommentActionsProvider",
    );
  }

  return context;
}

export function createCommentActionsContext<TExtraPostComment>() {
  return {
    CommentActionsProvider({
      children,
      value,
    }: {
      children: React.ReactNode;
      value: CommentActionsContextType<TExtraPostComment>;
    }) {
      return (
        <CommentActionsContext.Provider value={value}>
          {children}
        </CommentActionsContext.Provider>
      );
    },

    useCommentActions(): CommentActionsContextType<TExtraPostComment> {
      const context = useContext(CommentActionsContext);

      if (!context) {
        throw new Error(
          "useCommentActions must be used within a CommentActionsProvider",
        );
      }

      return context;
    },
  };
}
