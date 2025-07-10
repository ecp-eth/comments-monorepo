"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { getWagmiConfig } from "../lib/wagmi";
import { useMemo } from "react";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { PendingWalletConnectionActionsProvider } from "@ecp.eth/shared/components";
import { ApplyTheme } from "@/components/ApplyTheme";
import {
  EmbedConfigProvider,
  EmbedConfigProviderByAuthorConfig,
  EmbedConfigProviderByTargetURIConfig,
  EmbedConfigProviderByRepliesConfig,
} from "@/components/EmbedConfigProvider";

const queryClient = new QueryClient();

export function Providers<
  TConfig extends
    | EmbedConfigProviderByTargetURIConfig
    | EmbedConfigProviderByAuthorConfig
    | EmbedConfigProviderByRepliesConfig,
>({ children, config }: { children: React.ReactNode; config: TConfig }) {
  const wagmiConfig = useMemo(() => getWagmiConfig(config.chainId), [config]);
  /**
   * This is a workaround to fix the issue when using ssr but not having cookies so the wagmi state
   * is rehydrated after mount which would result in going from disconnected -> connecting -> connected/disconnected
   * causing queries to be fetched multiple times if the account is connected (queries for disconnected and then the same queries for connected).
   */
  const initialState = useMemo(() => {
    return {
      ...wagmiConfig.state,
      status: "connecting" as const,
    };
  }, [wagmiConfig.state]);

  return (
    <EmbedConfigProvider value={config}>
      <ApplyTheme>
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={wagmiConfig} initialState={initialState}>
            <RainbowKitProvider>
              <PendingWalletConnectionActionsProvider>
                {children}
              </PendingWalletConnectionActionsProvider>
            </RainbowKitProvider>
          </WagmiProvider>
        </QueryClientProvider>
      </ApplyTheme>
    </EmbedConfigProvider>
  );
}
