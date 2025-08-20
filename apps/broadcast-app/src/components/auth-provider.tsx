"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { UnauthorizedError } from "@/errors";
import { REFRESH_TOKEN_LOCAL_STORAGE_KEY } from "@/constants";

export type AuthContextValue =
  | {
      isLoggedIn: false;
      updateTokens: (accessToken: string, refreshToken: string) => void;
    }
  | {
      isLoggedIn: true;
      accessToken: string | null;
      refreshToken: string;
      updateTokens: (accessToken: string, refreshToken: string) => void;
      logout: () => void;
    };

const authContext = createContext<AuthContextValue>({
  isLoggedIn: false,
  updateTokens: () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(authContext);
}

/**
 * This is a hook that throws an error if the user is not logged in.
 * It is used to protect routes from unauthorized access (when api returns 401).
 * It is caught by error boundary in auth part of the app.
 *
 * @param apiError - The error to throw if the user is not logged in.
 */
export function useAuthProtect(apiError: Error | undefined | null) {
  if (apiError instanceof UnauthorizedError) {
    throw apiError;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [tokens, setTokens] = useState<null | {
    accessToken: string | null;
    refreshToken: string;
  }>(() => {
    if (typeof localStorage === "undefined") {
      return null;
    }

    const refreshToken = localStorage.getItem(REFRESH_TOKEN_LOCAL_STORAGE_KEY);

    // @todo validate jwt token expired
    if (!refreshToken) {
      return null;
    }

    // on refresh the access token must be refreshed using refresh token
    return {
      accessToken: null,
      refreshToken,
    };
  });

  const logout = useCallback(() => {
    setTokens(null);
  }, []);

  const updateTokens = useCallback(
    (accessToken: string, refreshToken: string) => {
      setTokens({ accessToken, refreshToken });
    },
    [],
  );

  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      if (tokens) {
        localStorage.setItem(
          REFRESH_TOKEN_LOCAL_STORAGE_KEY,
          tokens.refreshToken,
        );
      } else {
        localStorage.removeItem(REFRESH_TOKEN_LOCAL_STORAGE_KEY);
      }
    }
  }, [tokens]);

  const value = useMemo((): AuthContextValue => {
    if (!tokens) {
      return {
        isLoggedIn: false,
        updateTokens,
      };
    }

    return {
      isLoggedIn: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      updateTokens,
      logout,
    };
  }, [tokens, updateTokens, logout]);

  return <authContext.Provider value={value}>{children}</authContext.Provider>;
}
