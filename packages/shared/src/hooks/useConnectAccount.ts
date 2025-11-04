import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useCallback, useEffect, useRef } from "react";
import type { Hex } from "viem";
import { useAccount, useAccountEffect } from "wagmi";
import { useFreshRef } from "./useFreshRef.js";
import { usePendingWalletConnectionActionsContext } from "../components/PendingWalletConnectionActionsContext.js";

const CONNECT_WALLET_TIMEOUT = 2 * 60 * 1000; // 2 minutes

export class ConnectAccountError extends Error {
  constructor(message: string) {
    super(message);

    this.name = "ConnectAccountError";
  }
}

export class ConnectAccountTimeoutError extends ConnectAccountError {
  constructor() {
    super("Connecting a wallet timed out");

    this.name = "ConnectAccountTimeoutError";
  }
}

type Deferred = {
  resolve: (account: Hex) => void;
  reject: (error: Error) => void;
  promise?: Promise<Hex>;
  timeout: NodeJS.Timeout;
};

/**
 * This hook is used to connect to a wallet and returns the address.
 */
export function useConnectAccount() {
  const pendingWalletConnectionActionsContext =
    usePendingWalletConnectionActionsContext();
  const { address: connectedAddress } = useAccount();
  const { openConnectModal, connectModalOpen } = useConnectModal();
  const previousConnectModalRef = useRef(connectModalOpen);
  const deferredRef = useRef<Deferred | null>(null);
  const addressRef = useFreshRef(connectedAddress);

  useAccountEffect({
    onConnect(data) {
      if (deferredRef.current) {
        deferredRef.current.resolve(data.address);
      }
    },
  });

  useEffect(() => {
    if (
      previousConnectModalRef.current &&
      !connectModalOpen &&
      !addressRef.current
    ) {
      deferredRef.current?.reject(
        new ConnectAccountError("Please connect a wallet to continue"),
      );
    }

    previousConnectModalRef.current = connectModalOpen;
  }, [addressRef, connectModalOpen]);

  return useCallback(async (): Promise<Hex> => {
    const ret = await (async () => {
      if (connectedAddress) {
        return connectedAddress;
      }

      if (deferredRef.current && deferredRef.current.promise) {
        return deferredRef.current.promise;
      }

      const deferred: Deferred = {
        resolve: () => {},
        reject: () => {},
        timeout: setTimeout(() => {
          deferred.reject(new ConnectAccountTimeoutError());
        }, CONNECT_WALLET_TIMEOUT),
      };

      deferred.promise = new Promise((resolve, reject) => {
        deferred.resolve = resolve;
        deferred.reject = reject;
      });

      deferredRef.current = deferred;

      if (openConnectModal) {
        openConnectModal();
      } else {
        deferred.reject(
          new ConnectAccountError(
            "openConnectModal from rainbowkit is not available",
          ),
        );
      }

      return deferred.promise.finally(() => {
        clearTimeout(deferred.timeout);
        deferredRef.current = null;
      });
    })();

    const onAfterConnectPromise =
      pendingWalletConnectionActionsContext.onAfterConnect?.();

    // PendingWalletConnectionActionsContext will not await connectAccount to finish, so we need let it know the promise
    // so it awaits it before triggering the actions
    pendingWalletConnectionActionsContext.onAfterConnectResultPromise =
      onAfterConnectPromise;

    await onAfterConnectPromise;

    return ret;
  }, [
    pendingWalletConnectionActionsContext,
    connectedAddress,
    openConnectModal,
  ]);
}
