"use client";

import { createContext, useContext, useMemo, useState } from "react";

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
