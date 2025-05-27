import { createCommentActionsContext } from "../core/CommentActionsContext";
import { SwapWithCommentExtra } from "./hooks/useCommentActions";

export const { CommentActionsProvider, useCommentActions } =
  createCommentActionsContext<SwapWithCommentExtra>();
