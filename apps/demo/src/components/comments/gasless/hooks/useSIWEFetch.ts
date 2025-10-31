import { useCallback } from "react";
import { useSIWELoginProvider } from "../SIWELoginProvider";

export function useSIWEFetch() {
  const siweLoginContext = useSIWELoginProvider();
  return useCallback(
    (input: string | URL | globalThis.Request, init?: RequestInit) => {
      const accessToken = siweLoginContext.tokens?.accessToken;

      if (!accessToken) {
        throw new Error("No access token found");
      }

      return fetch(input, {
        ...init,
        headers: {
          ...init?.headers,
          Authorization: `Bearer ${accessToken}`,
        },
      });
    },
    [siweLoginContext.tokens?.accessToken],
  );
}
