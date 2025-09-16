import {
  type RefreshAccessTokenResponse,
  RefreshAccessTokenResponseSchema,
} from "@/api/schemas/siwe";
import type { AuthContextValue } from "@/components/auth-provider";

let refreshAccessTokenPromise:
  | Promise<false | RefreshAccessTokenResponse>
  | undefined;

type SecureFetchParams = {
  headers: Record<string, string>;
};

/**
 * This function is used to fetch data from the server.
 * It will automatically refresh the access token if it is expired.
 *
 * @example
 * ```ts
 * const response = await secureFetch(authContext, async ({ headers }) => {
 *   return fetch("https://api.example.com", { headers });
 * });
 * ```
 *
 * @param authContext - The auth context.
 * @param fetchFn - The fetch function.
 * @returns The response from the server.
 */
export async function secureFetch(
  authContext: AuthContextValue,
  fetchFn: (params: SecureFetchParams) => Promise<Response>,
): Promise<Response> {
  const headers: Record<string, string> = {};
  let hasRefreshed = false;

  if (authContext.isLoggedIn && authContext.accessToken) {
    headers["Authorization"] = `Bearer ${authContext.accessToken}`;
  }

  while (true) {
    const response = await fetchFn({ headers });

    if (response.status === 401) {
      // prevent infinite cycle
      if (hasRefreshed) {
        return response;
      }

      // refresh access token because it probably expired
      refreshAccessTokenPromise ||= refreshAccessToken(authContext);

      // if there are multiple requests waiting for the access token to be refreshed,
      // we only want to refresh it once
      const newTokens = await refreshAccessTokenPromise;

      refreshAccessTokenPromise = undefined;

      hasRefreshed = true;

      if (newTokens) {
        headers["Authorization"] = `Bearer ${newTokens.accessToken.token}`;

        authContext.updateAccessToken(newTokens.accessToken.token);

        continue; // retry the request with the new access token
      } else if (authContext.isLoggedIn) {
        authContext.logout();
      }
    }

    return response;
  }
}

async function refreshAccessToken(
  authContext: AuthContextValue,
): Promise<false | RefreshAccessTokenResponse> {
  if (!authContext.isLoggedIn) {
    return false;
  }

  const response = await fetch("/api/auth/siwe/refresh", {
    method: "POST",
  });

  if (response.status === 401) {
    return false;
  }

  if (!response.ok) {
    throw new Error("Failed to refresh access token");
  }

  return RefreshAccessTokenResponseSchema.parse(await response.json());
}
