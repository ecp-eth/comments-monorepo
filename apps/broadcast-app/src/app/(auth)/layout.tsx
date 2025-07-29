"use client";
import { sdk } from "@farcaster/miniapp-sdk";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { config } from "@/wagmi/config";
import { MiniAppProvider } from "@/hooks/useMiniAppContext";

const queryClient = new QueryClient();

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    sdk.actions.ready();
    sdk.back.enableWebNavigation();

    sdk.isInMiniApp().then((isInMiniApp) => {
      setIsReady(isInMiniApp);
    });
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <MiniAppProvider>
        <WagmiProvider config={config}>{children}</WagmiProvider>
      </MiniAppProvider>
    </QueryClientProvider>
  );
}
