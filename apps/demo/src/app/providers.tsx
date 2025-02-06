"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { getConfig } from "../lib/wagmi";
import { useState } from "react";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";

const queryClient = new QueryClient();

export function Provider({ children }: { children: React.ReactNode }) {
  const [config] = useState(getConfig());

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
