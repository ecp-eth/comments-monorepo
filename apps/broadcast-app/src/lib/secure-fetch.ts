import {
  type RefreshAccessTokenResponse,
  refreshAccessTokenResponseSchema,
} from "@/app/api/schemas";
import type { AuthContextValue } from "@/components/auth-provider";

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
) {
  const headers: Record<string, string> = {};

  if (authContext.isLoggedIn && authContext.accessToken) {
    headers["Authorization"] = `Bearer ${authContext.accessToken}`;
  }

  while (true) {
    const response = await fetchFn({ headers });

    if (response.status === 401) {
      // refresh access token because it probably expired
      const newTokens = await refreshAccessToken(authContext);

      if (newTokens) {
        headers["Authorization"] = `Bearer ${newTokens.accessToken.token}`;

        authContext.updateTokens(
          newTokens.accessToken.token,
          newTokens.refreshToken.token,
        );

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

  const response = await fetch("api/auth/siwe/refresh", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authContext.refreshToken}`,
    },
  });

  if (response.status === 401) {
    return false;
  }

  if (!response.ok) {
    throw new Error("Failed to refresh access token");
  }

  return refreshAccessTokenResponseSchema.parse(await response.json());
}
