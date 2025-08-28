"use client";
import { sdk } from "@farcaster/miniapp-sdk";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { webConfig, miniAppConfig } from "@/wagmi/client";
import { MiniAppProvider } from "@/hooks/useMiniAppContext";
import { PendingWalletConnectionActionsProvider } from "@/components/pending-wallet-connections-context";
import { AuthProvider } from "@/components/auth-provider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    },
  },
});

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isInMiniApp, setIsInMiniApp] = useState(false);

  useEffect(() => {
    async function ready() {
      const isInMiniApp = await sdk.isInMiniApp();

      if (!isInMiniApp) {
        return;
      }

      await sdk.actions.ready();
      await sdk.back.enableWebNavigation();

      setIsInMiniApp(isInMiniApp);
    }

    ready();
  }, []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <MiniAppProvider>
          <WagmiProvider config={isInMiniApp ? miniAppConfig : webConfig}>
            <RainbowKitProvider>
              <PendingWalletConnectionActionsProvider>
                {children}
              </PendingWalletConnectionActionsProvider>
            </RainbowKitProvider>
          </WagmiProvider>
        </MiniAppProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}
