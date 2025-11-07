import { useCallback } from "react";
import {
  setTokens,
  siweTokenSingleton,
} from "@/components/comments/core/SIWELoginProvider";
import { SIWETokens } from "@/lib/schemas";
import { getIndexerURL } from "@/lib/utils";
import { IndexerSIWERefreshResponseBodySchema } from "@ecp.eth/shared/schemas/indexer-siwe-api/refresh";

export function useSIWEFetch() {
  return useCallback(
    async (input: string | URL | globalThis.Request, init?: RequestInit) => {
      const triggerFetch = () => {
        const accessToken = siweTokenSingleton.current?.accessToken.token;
        return fetch(input, {
          ...init,
          headers: {
            ...init?.headers,
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        });
      };

      const res = await triggerFetch();

      if (res.status === 401 && siweTokenSingleton.current) {
        const refreshedTokens = await refreshTokens(siweTokenSingleton.current);
        setTokens(refreshedTokens);
        return await triggerFetch();
      }

      return res;
    },
    [],
  );
}

async function refreshTokens(tokens: SIWETokens) {
  const refreshResponse = await fetch(getIndexerURL("/api/auth/siwe/refresh"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens.refreshToken.token}`,
    },
  });

  if (!refreshResponse.ok) {
    throw new Error("Failed to refresh tokens");
  }

  const refreshResponseData = await refreshResponse.json();

  const { accessToken, refreshToken } =
    IndexerSIWERefreshResponseBodySchema.parse(refreshResponseData);

  return {
    address: tokens.address,
    accessToken,
    refreshToken,
  };
}
