"use client";

import { createContext, useContext } from "react";

export type Config = {
  targetUri: string;
};

const configContext = createContext<Config>({
  targetUri: "",
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
