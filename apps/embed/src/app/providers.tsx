"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { getWagmiConfig } from "../lib/wagmi";
import { useMemo } from "react";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { ApplyTheme } from "@/components/ApplyTheme";
import {
  EmbedConfigProvider,
  EmbedConfigProviderByAuthorConfig,
  EmbedConfigProviderByTargetURIConfig,
} from "@/components/EmbedConfigProvider";

const queryClient = new QueryClient();

export function Providers<
  TConfig extends
    | EmbedConfigProviderByTargetURIConfig
    | EmbedConfigProviderByAuthorConfig,
>({ children, config }: { children: React.ReactNode; config: TConfig }) {
  const wagmiConfig = useMemo(() => getWagmiConfig(config.chainId), [config]);

  return (
    <EmbedConfigProvider value={config}>
      <ApplyTheme>
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={wagmiConfig}>
            <RainbowKitProvider>{children}</RainbowKitProvider>
          </WagmiProvider>
        </QueryClientProvider>
      </ApplyTheme>
    </EmbedConfigProvider>
  );
}
