import { useAccount, useConfig, useConnect } from "wagmi";
import {
  useConnectAccount as useConnectAccountUsingWagmi,
  useFreshRef,
} from "@ecp.eth/shared/hooks";
import { useCallback } from "react";
import { useMiniAppContext } from "./useMiniAppContext";
import { getAccount } from "@wagmi/core";

/**
 * This hook is used to connect an account to the app.
 * It will use the mini app if it is in a mini app, otherwise it will use the wagmi connector.
 *
 * @returns The address of the connected account.
 */
export function useConnectAccount() {
  const config = useConfig();
  const configRef = useFreshRef(config);
  const miniAppContext = useMiniAppContext();
  const { address: connectedAddress } = useAccount();
  const addressRef = useFreshRef(connectedAddress);
  const connectAccountUsingWagmi = useConnectAccountUsingWagmi();
  const { connectAsync: connectAccountUsingMiniApp, connectors } = useConnect();

  return useCallback(async () => {
    if (addressRef.current) {
      return addressRef.current;
    }

    if (miniAppContext.isInMiniApp) {
      await connectAccountUsingMiniApp({
        connector: connectors[0],
      });

      const address = getAccount(configRef.current).address;

      if (!address) {
        throw new Error("Failed to get account address");
      }

      return address;
    }

    return connectAccountUsingWagmi();
  }, [
    addressRef,
    miniAppContext.isInMiniApp,
    connectAccountUsingWagmi,
    connectAccountUsingMiniApp,
    connectors,
    configRef,
  ]);
}
