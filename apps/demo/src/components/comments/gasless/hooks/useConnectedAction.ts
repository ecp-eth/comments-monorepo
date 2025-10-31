"use client";
import { useApprovalStatus } from "@ecp.eth/shared/hooks/useApprovalStatus";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { chain } from "@/lib/clientWagmi";
import { publicEnv } from "@/publicEnv";

/**
 * Ensure action to be performed only if 1) the user is connected and 2) finished loading approval status
 * @param action - The action to be performed
 * @returns
 */
export function useConnectedAction(action: () => unknown) {
  const approvalStatus = useApprovalStatus(
    publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
    chain,
  );
  const [requestStatus, setRequestStatus] = useState(false);
  const { address: connectedAddress } = useAccount();

  useEffect(() => {
    if (requestStatus && connectedAddress && !approvalStatus.isPending) {
      action();
      setRequestStatus(false);
    }
  }, [action, connectedAddress, approvalStatus, requestStatus]);

  return {
    request: () => setRequestStatus(true),
  };
}
