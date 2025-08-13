"use client";
import { sdk } from "@farcaster/miniapp-sdk";
import { TransactionProvider } from "ethereum-identity-kit";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { config } from "@/wagmi/config";
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

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isReady, setIsReady] = useState(true);

  useEffect(() => {
    sdk.actions.ready();
    sdk.back.enableWebNavigation();

    // @todo remove this and allow the app to be used in the browser
    /*sdk.isInMiniApp().then((isInMiniApp) => {
      setIsReady(isInMiniApp);
    });*/
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <MiniAppProvider>
        <WagmiProvider config={config}>
          <PendingWalletConnectionActionsProvider>
            <TransactionProvider>{children}</TransactionProvider>
          </PendingWalletConnectionActionsProvider>
        </WagmiProvider>
      </MiniAppProvider>
    </QueryClientProvider>
  );
}
