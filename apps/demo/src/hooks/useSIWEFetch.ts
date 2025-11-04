import { useCallback } from "react";
import { siweTokenSingleton } from "@/components/comments/core/SIWELoginProvider";

export function useSIWEFetch() {
  return useCallback(
    (input: string | URL | globalThis.Request, init?: RequestInit) => {
      const accessToken = siweTokenSingleton.current?.accessToken.token;

      return fetch(input, {
        ...init,
        headers: {
          ...init?.headers,
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
    },
    [],
  );
}
