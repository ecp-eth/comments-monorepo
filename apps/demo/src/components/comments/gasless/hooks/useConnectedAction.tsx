"use client";
import { useApprovalStatus } from "@/hooks/useApprovalStatus";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";

export function useConnectedAction(action: () => unknown) {
  const approvalStatus = useApprovalStatus();
  const [requestApprovalOnConnect, setRequestApprovalOnConnect] =
    useState(false);
  const { address: connectedAddress } = useAccount();

  useEffect(() => {
    if (
      requestApprovalOnConnect &&
      connectedAddress &&
      !approvalStatus.isPending
    ) {
      action();
      setRequestApprovalOnConnect(false);
    }
  }, [action, connectedAddress, requestApprovalOnConnect, approvalStatus]);

  return {
    setRequestApprovalOnConnect,
  };
}
