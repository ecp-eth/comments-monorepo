/**
 * This module is used to handle tricky logic of "connect wallet then like/unlike".
 *
 * When wallet connected, it causes tanstack query to reset and resulting
 * CommentItem -> Comment -> CommentActionsContext to be remounted,
 * this result the original async action trigger by old instance of CommentActionsContext
 * always referring to old cached props and data.
 *
 * This module allow the like/unlike action to be pushed into a queue and then consumed when
 * wallet is connected with up-to-date data and props
 */
import { Hex } from "@ecp.eth/sdk/core/schemas";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { useAccount } from "wagmi";
import { useFreshRef } from "@ecp.eth/shared/hooks";

type PendingWalletConnectionAction =
  | {
      type: "like";
      commentId: Hex;
    }
  | {
      type: "unlike";
      commentId: Hex;
    };

type PendingWalletConnectionActionHandler = {
  like: () => void;
  unlike: () => void;
};

type PendingWalletConnectionActionHandlerRecord = Record<
  Hex,
  PendingWalletConnectionActionHandler
>;

type PendingWalletConnectionActionsContextType = {
  actions: PendingWalletConnectionAction[];
  handlers: PendingWalletConnectionActionHandlerRecord;
};

const PendingWalletConnectionActionsContext =
  createContext<PendingWalletConnectionActionsContextType>({
    actions: [],
    handlers: {},
  });

export const PendingWalletConnectionActionsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const actionsRef = useRef<PendingWalletConnectionAction[]>([]);
  const handlersRef = useRef<PendingWalletConnectionActionHandlerRecord>({});

  return (
    <PendingWalletConnectionActionsContext.Provider
      value={{ actions: actionsRef.current, handlers: handlersRef.current }}
    >
      {children}
    </PendingWalletConnectionActionsContext.Provider>
  );
};

const usePendingWalletConnectionActions = () => {
  return useContext(PendingWalletConnectionActionsContext);
};

const useTriggerPendingWalletConnectionActions = () => {
  const { address } = useAccount();
  const { actions, handlers } = usePendingWalletConnectionActions();

  return useCallback(() => {
    if (!address) {
      return;
    }

    for (let len = actions.length; len > 0; len--) {
      const action = actions[len - 1];
      const handler = handlers[action.commentId];
      if (!handler) {
        continue;
      }
      // Remove the action from the array if handler is found.
      actions.splice(len - 1, 1);
      handler[action.type]();
    }
  }, [actions, address, handlers]);
};

/**
 * Append a pending wallet connection action to the context.
 * @returns
 */
export const useAppendPendingWalletConnectionAction = () => {
  const context = usePendingWalletConnectionActions();
  const triggerPendingWalletConnectionActions =
    useTriggerPendingWalletConnectionActions();

  return useCallback(
    (action: PendingWalletConnectionAction) => {
      context.actions.push(action);
      triggerPendingWalletConnectionActions();
    },
    [context, triggerPendingWalletConnectionActions],
  );
};

export const useConsumePendingWalletConnectionActions = ({
  commentId,
  onLikeAction,
  onUnlikeAction,
}: {
  commentId: Hex;
  onLikeAction: (commentId: Hex) => void;
  onUnlikeAction: (commentId: Hex) => void;
}) => {
  const { handlers } = usePendingWalletConnectionActions();
  const onLikeActionRef = useFreshRef(onLikeAction);
  const onUnlikeActionRef = useFreshRef(onUnlikeAction);
  const triggerPendingWalletConnectionActions =
    useTriggerPendingWalletConnectionActions();

  useEffect(() => {
    handlers[commentId] = {
      like: () => {
        onLikeActionRef.current(commentId);
      },
      unlike: () => {
        onUnlikeActionRef.current(commentId);
      },
    };

    // Trigger pending wallet connection actions when the handler is added.
    triggerPendingWalletConnectionActions();

    return () => {
      delete handlers[commentId];
    };
  }, [
    commentId,
    handlers,
    onLikeActionRef,
    onUnlikeActionRef,
    triggerPendingWalletConnectionActions,
  ]);
};
