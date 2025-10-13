import { AddApprovalStatusRequestBodySchemaType } from "@/lib/schemas";
import { publicEnv } from "@/publicEnv";
import {
  ContractReadFunctions,
  createApprovalTypedData,
  getNonce,
} from "@ecp.eth/sdk/comments";
import { Hex } from "@ecp.eth/sdk/core/schemas";
import { bigintReplacer } from "@ecp.eth/shared/helpers";
import { SignTypedDataMutateAsync } from "wagmi/query";

export async function addApproval({
  author,
  chainId,
  readContractAsync,
  signTypedDataAsync,
}: {
  author: Hex;
  chainId: number;
  readContractAsync: ContractReadFunctions["getNonce"];
  signTypedDataAsync: SignTypedDataMutateAsync;
}) {
  const nonce = await getNonce({
    author,
    app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
    readContract: readContractAsync as ContractReadFunctions["getNonce"],
  });

  const signTypedDataParams = createApprovalTypedData({
    author,
    app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
    chainId,
    nonce,
  });

  const authorSignature = await signTypedDataAsync(signTypedDataParams);

  const response = await fetch("/api/add-approval", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      {
        signTypedDataParams,
        authorSignature,
        authorAddress: author,
        chainId,
      } satisfies AddApprovalStatusRequestBodySchemaType,
      bigintReplacer, // because typed data contains a bigint when parsed using our zod schemas
    ),
  });

  if (!response.ok) {
    throw new Error(
      "Failed to post approval signature, the service is temporarily unavailable, please try again later",
    );
  }
}
