/**
 * This module is used to handle tricky logic of "connect wallet then like/unlike".
 *
 * When wallet connected, it causes tanstack query to reset and resulting
 * CommentItem -> Comment -> CommentActionsContext to be remounted,
 * this result the original async action trigger by old instance of CommentActionsContext
 * always referring to old cached props and data.
 * (the action function resides in the unmounted instance of CommentActionsContext, no further render received,
 * so using useFreshRef does not help)
 *
 * This module allows the like/unlike action to be pushed into a queue and then consumed when
 * wallet is connected with up-to-date data and props
 */
import { useConnectAccount } from "@/hooks/useConnectAccount";
import type { Hex } from "@ecp.eth/sdk/core/schemas";
import { useFreshRef } from "@ecp.eth/shared/hooks";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useAccount, useConnect, useConnectorClient } from "wagmi";

type PendingWalletConnectionAction =
  | {
      type: "like";
      commentId: Hex;
    }
  | {
      type: "unlike";
      commentId: Hex;
    }
  | {
      // for the ui to prepare for replying
      type: "prepareReply";
      commentId: Hex;
    };

type PendingWalletConnectionActionHandler = {
  like: () => void;
  unlike: () => void;
  prepareReply: () => void;
};

type PendingWalletConnectionActionHandlerRecord = Record<
  Hex,
  PendingWalletConnectionActionHandler
>;

type PendingWalletConnectionActionsContextType = {
  addAction: (action: PendingWalletConnectionAction) => void;
  addHandler: (
    commentId: Hex,
    handler: PendingWalletConnectionActionHandler,
  ) => void;
  deleteHandler: (commentId: Hex) => void;
};

const PendingWalletConnectionActionsContext =
  createContext<PendingWalletConnectionActionsContextType>({
    addAction: () => {},
    addHandler: () => {},
    deleteHandler: () => {},
  });

export const PendingWalletConnectionActionsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const actionsRef = useRef<PendingWalletConnectionAction[]>([]);
  const handlersRef = useRef<PendingWalletConnectionActionHandlerRecord>({});
  const { address: connectedAddress } = useAccount();
  const { data: client } = useConnectorClient();

  const triggerActions = useCallback(() => {
    // interestingly when useAccount is able to return the address, useConnectorClient still need to takes a bit of time.
    // without checking it the like/unlike hooks in embed will failed as they rely on the client to be available
    if (!connectedAddress || !client) {
      return;
    }

    const actions = actionsRef.current;
    const handlers = handlersRef.current;

    for (let len = actions.length; len > 0; len--) {
      const action = actions[len - 1];
      if (!action) {
        continue;
      }

      const handler = handlers[action.commentId];
      if (!handler) {
        continue;
      }
      // Remove the action from the array if handler is found.
      actions.splice(len - 1, 1);

      handler[action.type]();
    }
  }, [client, connectedAddress]);

  useEffect(() => {
    triggerActions();
  }, [triggerActions]);

  const value = useMemo(() => {
    return {
      addAction: (action: PendingWalletConnectionAction) => {
        actionsRef.current.push(action);

        triggerActions();
      },
      addHandler: (
        commentId: Hex,
        handler: PendingWalletConnectionActionHandler,
      ) => {
        handlersRef.current[commentId] = handler;

        triggerActions();
      },
      deleteHandler: (commentId: Hex) => {
        delete handlersRef.current[commentId];
      },
    };
  }, [triggerActions]);

  return (
    <PendingWalletConnectionActionsContext.Provider value={value}>
      {children}
    </PendingWalletConnectionActionsContext.Provider>
  );
};

export const usePendingWalletConnectionActionsContext = () => {
  return useContext(PendingWalletConnectionActionsContext);
};

/**
 * Setup handlers for the specified comment and consume the corresponding pending actions when wallet is connected.
 * @returns
 */
export const useConsumePendingWalletConnectionActions = ({
  commentId,
  onLikeAction,
  onUnlikeAction,
  onPrepareReplyAction,
}: {
  commentId: Hex;
  onLikeAction: (commentId: Hex) => void;
  onUnlikeAction: (commentId: Hex) => void;
  onPrepareReplyAction: (commentId: Hex) => void;
}) => {
  const onLikeActionRef = useFreshRef(onLikeAction);
  const onUnlikeActionRef = useFreshRef(onUnlikeAction);
  const onPrepareReplyActionRef = useFreshRef(onPrepareReplyAction);
  const { addHandler, deleteHandler } =
    usePendingWalletConnectionActionsContext();

  useEffect(() => {
    addHandler(commentId, {
      like: () => {
        onLikeActionRef.current(commentId);
      },
      unlike: () => {
        onUnlikeActionRef.current(commentId);
      },
      prepareReply: () => {
        onPrepareReplyActionRef.current(commentId);
      },
    });

    return () => {
      deleteHandler(commentId);
    };
  }, [
    commentId,
    addHandler,
    deleteHandler,
    onLikeActionRef,
    onUnlikeActionRef,
    onPrepareReplyActionRef,
  ]);
};

/**
 * The hook returns a function that ensures wallet is connected before calling into the callback,
 * then it executes the action returned from the callback.
 */
export const useConnectBeforeAction = () => {
  const { addAction } = usePendingWalletConnectionActionsContext();
  const connectAccount = useConnectAccount();
  const { address: connectedAddress } = useAccount();

  return useCallback(
    <TParams extends unknown[]>(
      getAction: (
        ...args: TParams
      ) =>
        | Promise<PendingWalletConnectionAction | void>
        | PendingWalletConnectionAction
        | void,
    ) => {
      return async (...args: TParams) => {
        if (!connectedAddress) {
          await connectAccount();
        }

        const action = await getAction(...args);

        if (!action) {
          return;
        }

        addAction(action);
      };
    },
    [addAction, connectAccount, connectedAddress],
  );
};
