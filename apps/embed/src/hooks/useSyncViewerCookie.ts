import { useEffect } from "react";
import { useAccount } from "wagmi";

export function useSyncViewerCookie() {
  const { address, status } = useAccount();

  useEffect(() => {
    if (address) {
      document.cookie = `viewer=${address}; max-age=31536000`;
      return;
    }

    // remove the cookie if the user is not connected
    document.cookie = `viewer=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }, [address, status]);
}
