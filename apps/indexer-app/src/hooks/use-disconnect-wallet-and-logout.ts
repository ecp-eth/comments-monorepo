import { useAuth } from "@/components/auth-provider";
import { useCallback } from "react";
import { useDisconnect } from "wagmi";

export function useDisconnectWalletAndLogout() {
  const { disconnect } = useDisconnect();
  const auth = useAuth();

  return useCallback(() => {
    if (auth.isLoggedIn) {
      auth.logout();
    }

    disconnect();
  }, [auth, disconnect]);
}
