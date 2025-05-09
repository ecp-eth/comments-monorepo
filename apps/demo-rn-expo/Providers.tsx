import React, { PropsWithChildren } from "react";
import { WagmiProvider } from "wagmi";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { anvil } from "@wagmi/core/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit, AppKit } from "@reown/appkit-wagmi-react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { projectId, config as wagmiConfig } from "./wagmi.config";
import ErrorBoundary from "./ErrorBoundary";

const queryClient = new QueryClient();

createAppKit({
  projectId,
  featuredWalletIds: [
    // rainbow
    "1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369",
    // Zerion
    "ecc4036f814562b41a5268adc86270fba1365471402006302e70169465b7ac18",
    // metamask
    "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96",
  ],
  wagmiConfig,
  defaultChain: anvil,
  enableAnalytics: true,
});

export default function Providers({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView>{children}</GestureHandlerRootView>
            <AppKit />
            <Toast />
          </QueryClientProvider>
        </WagmiProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
