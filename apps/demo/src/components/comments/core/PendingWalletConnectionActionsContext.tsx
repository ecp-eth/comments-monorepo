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
import { Hex } from "@ecp.eth/sdk/core/schemas";
import { createContext, useContext, useEffect, useMemo, useRef } from "react";
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
  const connectedAddressRef = useFreshRef(connectedAddress);

  const value = useMemo(() => {
    const triggerActions = () => {
      if (!connectedAddressRef.current) {
        return;
      }

      const actions = actionsRef.current;
      const handlers = handlersRef.current;

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
    };

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
  }, [connectedAddressRef]);

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
}: {
  commentId: Hex;
  onLikeAction: (commentId: Hex) => void;
  onUnlikeAction: (commentId: Hex) => void;
}) => {
  const onLikeActionRef = useFreshRef(onLikeAction);
  const onUnlikeActionRef = useFreshRef(onUnlikeAction);
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
  ]);
};
