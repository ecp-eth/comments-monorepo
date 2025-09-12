"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { UnauthorizedError } from "@/errors";

export type AuthContextValue =
  | {
      isLoggedIn: false;
      updateAccessToken: (accessToken: string) => void;
    }
  | {
      isLoggedIn: true;
      accessToken: string | null;
      updateAccessToken: (accessToken: string) => void;
      logout: () => void;
    };

const authContext = createContext<AuthContextValue>({
  isLoggedIn: false,
  updateAccessToken: () => {},
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

type AuthProviderProps = {
  accessToken: string | null | undefined;
  children: React.ReactNode;
};

export function AuthProvider({ accessToken, children }: AuthProviderProps) {
  const [loadedAccessToken, setLoadedAccessToken] = useState<
    string | null | undefined
  >(accessToken);

  const value = useMemo((): AuthContextValue => {
    if (!loadedAccessToken) {
      return {
        isLoggedIn: false,
        updateAccessToken: (accessToken) => setLoadedAccessToken(accessToken),
      };
    }

    return {
      isLoggedIn: true,
      accessToken: loadedAccessToken,
      logout: () => {
        setLoadedAccessToken(null);

        fetch("/api/auth/logout");
      },
      updateAccessToken: (accessToken) => setLoadedAccessToken(accessToken),
    };
  }, [loadedAccessToken]);

  return <authContext.Provider value={value}>{children}</authContext.Provider>;
}
