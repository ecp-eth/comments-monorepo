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
  hasRefreshToken: boolean;
  accessToken: string | null;
  children: React.ReactNode;
};

export function AuthProvider({
  accessToken,
  hasRefreshToken,
  children,
}: AuthProviderProps) {
  const [state, setState] = useState<
    | {
        isLoggedIn: true;
        accessToken: string | null;
      }
    | {
        isLoggedIn: false;
      }
  >(() => {
    if (hasRefreshToken) {
      return {
        isLoggedIn: true,
        accessToken,
      };
    }

    return {
      isLoggedIn: false,
    };
  });

  const value = useMemo((): AuthContextValue => {
    if (state.isLoggedIn === false) {
      return {
        isLoggedIn: false,
        updateAccessToken: (accessToken) =>
          setState({
            isLoggedIn: true,
            accessToken,
          }),
      };
    }

    return {
      isLoggedIn: true,
      accessToken: state.accessToken,
      logout: () => {
        setState({ isLoggedIn: false });

        fetch("/api/auth/logout", { method: "POST" });
      },
      updateAccessToken: (accessToken) =>
        setState({
          isLoggedIn: true,
          accessToken,
        }),
    };
  }, [state]);

  return <authContext.Provider value={value}>{children}</authContext.Provider>;
}
