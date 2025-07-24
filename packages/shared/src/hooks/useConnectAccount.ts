import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useCallback, useEffect, useRef } from "react";
import type { Hex } from "viem";
import { useAccount, useAccountEffect } from "wagmi";
import { useFreshRef } from "./useFreshRef.js";

const CONNECT_WALLET_TIMEOUT = 2 * 60 * 1000; // 2 minutes
const WALLET_CONNECT_DIALOG_MINIMAL_HEIGHT = 480;

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
  const { address } = useAccount();
  const { openConnectModal, connectModalOpen } = useConnectModal();
  const previousConnectModalRef = useRef(connectModalOpen);
  const deferredRef = useRef<Deferred | null>(null);
  const addressRef = useFreshRef(address);

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
        new Error("Please connect a wallet to continue"),
      );
    }

    previousConnectModalRef.current = connectModalOpen;
  }, [addressRef, connectModalOpen]);

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

    if (openConnectModal) {
      setDialogMinimalHeight();
      openConnectModal();
    } else {
      deferred.reject(
        new Error("openConnectModal from rainbowkit is not available"),
      );
    }

    return deferred.promise.finally(() => {
      clearTimeout(deferred.timeout);
      deferredRef.current = null;
      resetDialogMinimalHeight();
    });
  }, [address, openConnectModal]);
}

let originalMinHeight: string | undefined;

function setDialogMinimalHeight() {
  originalMinHeight = document.body.style.minHeight;

  document.body.style.minHeight = `${WALLET_CONNECT_DIALOG_MINIMAL_HEIGHT}px`;
}

function resetDialogMinimalHeight() {
  if (originalMinHeight == null) {
    return;
  }
  document.body.style.minHeight = originalMinHeight;
  originalMinHeight = undefined;
}
