import z from "zod";
import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useRef,
} from "react";
import { useSIWELogin } from "./hooks/useSIWELogin";
import { IndexerSIWEVerifyResponseBodySchema } from "@ecp.eth/shared/schemas/indexer-siwe-api/verify";
import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import { useAccount } from "wagmi";

const SIWE_TOKENS_STORAGE_KEY = "siwe-tokens";
const SIWETokensSchema = IndexerSIWEVerifyResponseBodySchema.extend({
  address: HexSchema,
});
export type SIWETokens = z.output<typeof SIWETokensSchema>;
export const SIWELoginProviderContext = createContext<{
  tokens?: SIWETokens;
}>({});

export function SIWELoginProvider({ children }: PropsWithChildren) {
  const { address: connectedAddress } = useAccount();
  const siweTokensRef = useRef<SIWETokens | undefined>(undefined);

  useEffect(() => {
    if (!connectedAddress) {
      return;
    }

    const tokens = localStorage.getItem(SIWE_TOKENS_STORAGE_KEY);

    if (!tokens) {
      return;
    }

    const siweTokens = SIWETokensSchema.parse(JSON.parse(tokens));
    if (siweTokens.address !== connectedAddress) {
      return;
    }

    siweTokensRef.current = siweTokens;
  }, [connectedAddress]);

  useSIWELogin(siweTokensRef, (tokens) => {
    siweTokensRef.current = tokens;
    localStorage.setItem(SIWE_TOKENS_STORAGE_KEY, JSON.stringify(tokens));
  });

  return (
    <SIWELoginProviderContext.Provider
      value={{
        get tokens() {
          return siweTokensRef.current;
        },
      }}
    >
      {children}
    </SIWELoginProviderContext.Provider>
  );
}

export function useSIWELoginProvider() {
  return useContext(SIWELoginProviderContext);
}
