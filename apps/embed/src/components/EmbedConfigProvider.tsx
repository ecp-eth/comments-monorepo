"use client";

import { type Hex } from "@ecp.eth/sdk/core/schemas";
import {
  EmbedConfigSchema,
  type EmbedConfigSchemaOutputType,
} from "@ecp.eth/sdk/embed/schemas";
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

export type EmbedConfigProviderByRepliesConfig =
  EmbedConfigProviderBaseConfig & {
    commentId: Hex;
  };

const configContext = createContext<
  | EmbedConfigProviderByTargetURIConfig
  | EmbedConfigProviderByAuthorConfig
  | EmbedConfigProviderByRepliesConfig
>({
  currentTimestamp: Date.now(),
  author: zeroAddress,
  targetUri: "",
  commentId: zeroAddress,
  ...EmbedConfigSchema.parse({}),
});

type EmbedConfigProviderProps<TConfig extends EmbedConfigProviderBaseConfig> = {
  value: EmbedConfigProviderBaseConfig & TConfig;
  children: React.ReactNode;
};

export function EmbedConfigProvider<
  TConfig extends
    | EmbedConfigProviderByTargetURIConfig
    | EmbedConfigProviderByAuthorConfig
    | EmbedConfigProviderByRepliesConfig,
>({ value, children }: EmbedConfigProviderProps<TConfig>) {
  return (
    <configContext.Provider value={value}>{children}</configContext.Provider>
  );
}

export function useEmbedConfig<
  TConfig extends
    | EmbedConfigProviderByTargetURIConfig
    | EmbedConfigProviderByAuthorConfig
    | EmbedConfigProviderByRepliesConfig,
>() {
  return useContext(configContext) as TConfig;
}
