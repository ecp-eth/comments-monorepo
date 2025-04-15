import { useAccount } from "wagmi";

export function useIsAccountStatusResolved() {
  const { status } = useAccount();

  return status === "disconnected" || status === "connected";
}
