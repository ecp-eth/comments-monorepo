"use client";

import { createContext, useContext } from "react";

export type Config = {
  targetUri: string;
  /**
   * Used to calculate relative time in comments.
   */
  currentTimestamp: number;
};

const configContext = createContext<Config>({
  targetUri: "",
  currentTimestamp: Date.now(),
});

type EmbedConfigProviderProps = {
  value: Config;
  children: React.ReactNode;
};

export function EmbedConfigProvider({
  value,
  children,
}: EmbedConfigProviderProps) {
  return (
    <configContext.Provider value={value}>{children}</configContext.Provider>
  );
}

export function useEmbedConfig() {
  return useContext(configContext);
}
