"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { UnauthorizedError } from "@/errors";

type AuthContextValue = {
  isLoggedIn: boolean;
  setAsLoggedIn: (isLoggedIn: boolean) => void;
};

const authContext = createContext<AuthContextValue>({
  isLoggedIn: false,
  setAsLoggedIn: () => {},
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

export function AuthProvider({
  children,
  isLoggedIn,
}: {
  children: React.ReactNode;
  isLoggedIn: boolean;
}) {
  const [state, setState] = useState(isLoggedIn);

  const value = useMemo(() => {
    return {
      isLoggedIn: state,
      setAsLoggedIn: (isLoggedIn: boolean) => {
        setState(isLoggedIn);
      },
    };
  }, [state, setState]);

  return <authContext.Provider value={value}>{children}</authContext.Provider>;
}
