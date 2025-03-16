import React, { PropsWithChildren } from "react";
import { WagmiProvider } from "wagmi";
import { anvil } from "@wagmi/core/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createAppKit,
  defaultWagmiConfig,
  AppKit,
} from "@reown/appkit-wagmi-react-native";
import { publicEnv } from "./env";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const queryClient = new QueryClient();

const metadata = {
  name: "Ethereum Comments Protocol - React Native Demo",
  description: "A demo of the Ethereum Comments Protocol on React Native",
  url: "https://demo.ethcomments.xyz",
  icons: ["https://docs.ethcomments.xyz/logo-light.svg"],
  redirect: {
    native: "ECP_RN_DEMO://",
    universal: "rn.demo.ethcomments.xyz",
  },
};

const chains = [anvil] as const;
const projectId = publicEnv.EXPO_PUBLIC_REOWN_APP_ID;

const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
});

createAppKit({
  projectId,
  wagmiConfig,
  defaultChain: anvil,
  enableAnalytics: true,
});

export default function Providers({ children }: PropsWithChildren) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView>{children}</GestureHandlerRootView>
        <AppKit />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
