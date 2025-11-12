import { useCallback, useRef } from "react";
import { useAccount, useAccountEffect } from "wagmi";
import Deferred from "promise-deferred";
import { Hex } from "viem";
import { useAppKit } from "@reown/appkit-wagmi-react-native";
import { useAppStateEffect } from "./useAppStateEffect";

export default function useWaitConnected() {
  const { address } = useAccount();

  const { open } = useAppKit();
  const waitConnectedPromise = useRef<Deferred<Hex> | null>(null);
  const waitAppForegroundPromise = useRef<Deferred<void> | null>(null);

  useAppStateEffect({
    foregrounded: () => {
      waitAppForegroundPromise.current?.resolve();
    },
  });

  useAccountEffect({
    onConnect(data) {
      if (waitConnectedPromise.current) {
        waitConnectedPromise.current.resolve(data.address);
      }
    },
  });

  return useCallback(async (): Promise<Hex> => {
    if (address) {
      return address;
    }

    open();

    const walletConnectedDeferred = (waitConnectedPromise.current =
      new Deferred());

    const appForegroundedDeferred = (waitAppForegroundPromise.current =
      new Deferred());

    await appForegroundedDeferred.promise;

    const addr = await walletConnectedDeferred.promise;

    appForegroundedDeferred.current = undefined;
    waitConnectedPromise.current = undefined;

    return addr;
  }, [address, open]);
}
