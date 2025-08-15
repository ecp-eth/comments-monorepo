"use client";
import { sdk } from "@farcaster/miniapp-sdk";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { webConfig, miniAppConfig } from "@/wagmi/config";
import { MiniAppProvider } from "@/hooks/useMiniAppContext";
import { PendingWalletConnectionActionsProvider } from "@/components/pending-wallet-connections-context";

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
  const [isReady, setIsReady] = useState(false);
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // @todo do not block because of this, it should be done in the background
  useEffect(() => {
    async function ready() {
      try {
        await sdk.actions.ready();
        await sdk.back.enableWebNavigation();

        const isInMiniApp = await sdk.isInMiniApp();

        setIsInMiniApp(isInMiniApp);
        setIsReady(true);
      } catch (error) {
        console.error(error);
        setError(error instanceof Error ? error : new Error(String(error)));
      }
    }

    ready();
  }, []);

  if (error) {
    // @todo render nice error page
    return <div>Error: {error.message}</div>;
  }

  if (!isReady) {
    return null;
  }

  return (
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
  );
}
