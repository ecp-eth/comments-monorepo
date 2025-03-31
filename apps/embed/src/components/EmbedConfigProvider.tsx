"use client";

import {
  EmbedConfigSchema,
  EmbedConfigSchemaOutputType,
  Hex,
} from "@ecp.eth/sdk/schemas";
import { createContext, useContext } from "react";
import { zeroAddress } from "viem";

export type EmbedConfigProviderBaseConfig = EmbedConfigSchemaOutputType & {
  /**
   * Used to calculate relative time in comments.
   */
  currentTimestamp: number;
  /**
   * Hide powered by ECP link
   */
  disablePromotion: boolean;
};

export type EmbedConfigProviderByAuthorConfig =
  EmbedConfigProviderBaseConfig & {
    author: Hex;
  };

export type EmbedConfigProviderByTargetURIConfig =
  EmbedConfigProviderBaseConfig & {
    targetUri: string;
  };

const configContext = createContext<
  EmbedConfigProviderByTargetURIConfig | EmbedConfigProviderByAuthorConfig
>({
  currentTimestamp: Date.now(),
  author: zeroAddress,
  targetUri: "",
  ...EmbedConfigSchema.parse({}),
});

type EmbedConfigProviderProps<TConfig extends EmbedConfigProviderBaseConfig> = {
  value: EmbedConfigProviderBaseConfig & TConfig;
  children: React.ReactNode;
};

export function EmbedConfigProvider<
  TConfig extends
    | EmbedConfigProviderByTargetURIConfig
    | EmbedConfigProviderByAuthorConfig,
>({ value, children }: EmbedConfigProviderProps<TConfig>) {
  return (
    <configContext.Provider value={value}>{children}</configContext.Provider>
  );
}

export function useEmbedConfig<
  TConfig extends
    | EmbedConfigProviderByTargetURIConfig
    | EmbedConfigProviderByAuthorConfig,
>() {
  return useContext(configContext) as TConfig;
}
