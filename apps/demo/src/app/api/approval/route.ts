import { JSONResponse } from "@ecp.eth/shared/helpers";
import { COMMENTS_V1_ADDRESS, CommentsV1Abi } from "@ecp.eth/sdk";
import { createWalletClient, publicActions } from "viem";
import {
  ApproveResponseSchema,
  BadRequestResponseSchema,
  ChangeApprovalStatusRequestBodySchema,
  InternalServerErrorResponseSchema,
} from "@/lib/schemas";
import { resolveSubmitterAccount } from "@/lib/submitter";
import { chain, transport } from "@/lib/wagmi";

export async function POST(
  req: Request
): Promise<
  JSONResponse<
    | typeof BadRequestResponseSchema
    | typeof InternalServerErrorResponseSchema
    | typeof ApproveResponseSchema
  >
> {
  const parsedBodyResult = ChangeApprovalStatusRequestBodySchema.safeParse(
    await req.json()
  );

  if (!parsedBodyResult.success) {
    return new JSONResponse(
      BadRequestResponseSchema,
      parsedBodyResult.error.flatten().fieldErrors,
      { status: 400 }
    );
  }

  const { signTypedDataParams, authorSignature } = parsedBodyResult.data;

  // Can be any account with funds for gas on desired chain
  const submitterAccount = await resolveSubmitterAccount();

  const walletClient = createWalletClient({
    account: submitterAccount,
    chain,
    transport,
  }).extend(publicActions);

  try {
    const txHash = await walletClient.writeContract({
      abi: CommentsV1Abi,
      address: COMMENTS_V1_ADDRESS,
      functionName: "addApproval",
      args: [
        signTypedDataParams.message.author,
        signTypedDataParams.message.appSigner,
        signTypedDataParams.message.nonce,
        signTypedDataParams.message.deadline,
        authorSignature,
      ],
    });

    return new JSONResponse(ApproveResponseSchema, { txHash });
  } catch (error) {
    console.error(error);

    return new JSONResponse(
      InternalServerErrorResponseSchema,
      { error: "Failed to add approval" },
      { status: 500 }
    );
  }
}
