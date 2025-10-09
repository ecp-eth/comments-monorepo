import React, { useCallback, useMemo, useState, useEffect } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { Switch } from "../ui/switch";
import { useApprovalStatus } from "@ecp.eth/shared/hooks/useApprovalStatus";
import { useGaslessTransaction } from "@ecp.eth/sdk/comments/react";
import { useAccount } from "wagmi";
import { publicEnv } from "@/publicEnv";
import { createApprovalTypedData } from "@ecp.eth/sdk/comments";
import { useEmbedConfig } from "../EmbedConfigProvider";
import { bigintReplacer, getChainById } from "@ecp.eth/shared/helpers";
import never from "never";
import {
  AddApprovalResponseSchema,
  AddApprovalStatusRequestBodySchemaType,
} from "@/lib/schemas";
import { supportedChains } from "@/lib/wagmi";

export function ApprovalSwitch() {
  const [approvedOnBehalf, setApprovedOnBehalf] = useState(false);
  const config = useEmbedConfig();
  const chain = useMemo(
    () =>
      getChainById(config.chainId, supportedChains) ?? never("Chain not found"),
    [config],
  );
  const { address: viewer } = useAccount();
  const approvalStatus = useApprovalStatus(
    publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
    chain,
  );

  useEffect(() => {
    if (!approvalStatus.data) {
      return;
    }

    setApprovedOnBehalf(approvalStatus.data.approved);
  }, [approvalStatus.data]);

  const approveGaslessTransactionsMutation = useGaslessTransaction({
    async prepareSignTypedDataParams() {
      const approvalData = approvalStatus.data;

      if (!approvalData || !viewer) {
        throw new Error("No approval data found");
      }

      if (approvalData.approved) {
        throw new Error("Already approved");
      }

      const signTypedDataParams = createApprovalTypedData({
        author: viewer,
        app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
        chainId: chain?.id,
        nonce: approvalData.nonce,
      });

      return {
        signTypedDataParams: {
          ...signTypedDataParams,
          account: viewer,
        },
        variables: approvalData,
      };
    },
    async sendSignedData({ signature, signTypedDataParams }) {
      if (!viewer) {
        throw new Error("No viewer address found");
      }

      const response = await fetch("/api/add-approval", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          {
            signTypedDataParams,
            authorSignature: signature,
            authorAddress: viewer,
            chainId: chain?.id,
          } satisfies AddApprovalStatusRequestBodySchemaType,
          bigintReplacer, // because typed data contains a bigint when parsed using our zod schemas
        ),
      });

      if (!response.ok) {
        throw new Error(
          "Failed to post approval signature, the service is temporarily unavailable, please try again later",
        );
      }

      return AddApprovalResponseSchema.parse(await response.json()).txHash;
    },
  });
  const handleOnBehalfApprovalChange = useCallback(
    async (newValue: boolean) => {
      if (newValue) {
        await approveGaslessTransactionsMutation.mutateAsync();
      }
      setApprovedOnBehalf(newValue);
    },
    [approveGaslessTransactionsMutation],
  );

  if (!viewer) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <Switch
              id="approve-on-behalf"
              checked={approvedOnBehalf}
              onCheckedChange={handleOnBehalfApprovalChange}
              disabled={approvalStatus.isPending}
            />
            <label htmlFor="approve-on-behalf">One-click Posting</label>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>
            Post instantly and free of cost by allowing ECP to post on your
            behalf.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
