import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useCallback, useRef } from "react";
import type { Hex } from "viem";
import { useAccount, useAccountEffect } from "wagmi";

const CONNECT_WALLET_TIMEOUT = 2 * 60 * 1000; // 2 minutes

type Deferred = {
  resolve: (account: Hex) => void;
  reject: (error: Error) => void;
  promise?: Promise<Hex>;
  timeout: NodeJS.Timeout;
};

/**
 * This hook is used to connect to a wallet and return the address.
 */
export function useConnectAccount() {
  const { address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const deferredRef = useRef<Deferred | null>(null);

  useAccountEffect({
    onConnect(data) {
      if (deferredRef.current) {
        deferredRef.current.resolve(data.address);
      }
    },
  });

  return useCallback(async (): Promise<Hex> => {
    if (address) {
      return address;
    }

    if (deferredRef.current && deferredRef.current.promise) {
      return deferredRef.current.promise;
    }

    const deferred: Deferred = {
      resolve: () => {},
      reject: () => {},
      timeout: setTimeout(() => {
        deferred.reject(new Error("Connecting a wallet timed out"));
      }, CONNECT_WALLET_TIMEOUT),
    };

    deferred.promise = new Promise((resolve, reject) => {
      deferred.resolve = resolve;
      deferred.reject = reject;
    });

    deferredRef.current = deferred;

    openConnectModal?.();

    return deferred.promise.finally(() => {
      clearTimeout(deferred.timeout);
      deferredRef.current = null;
    });
  }, [address, openConnectModal]);
}
