"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { getConfig } from "../lib/wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { useState, useMemo } from "react";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  // load config only once on client side
  // (in dev strict mode it's called multiple times)
  const [config] = useState(() => getConfig());
  /**
   * This is a workaround to fix the issue when using ssr but not having cookies so the wagmi state
   * is rehydrated after mount which would result in going from disconnected -> connecting -> connected/disconnected
   * causing queries to be fetched multiple times if the account is connected (queries for disconnected and then the same queries for connected).
   */
  const initialState = useMemo(() => {
    return {
      ...config.state,
      status: "connecting" as const,
    };
  }, [config.state]);

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config} initialState={initialState}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
