import { env } from "@/env";
import {
  BadRequestResponseSchema,
  DeleteCommentRequestBodySchema,
  DeleteCommentResponseSchema,
  InternalServerErrorResponseSchema,
} from "@/lib/schemas";
import { resolveSubmitterAccount } from "@/lib/submitter";
import { chain, transport } from "@/lib/wagmi";
import { COMMENTS_V1_ADDRESS, CommentsV1Abi } from "@ecp.eth/sdk";
import { JSONResponse } from "@ecp.eth/shared/helpers";
import { createWalletClient, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export async function POST(
  req: Request
): Promise<
  JSONResponse<
    | typeof BadRequestResponseSchema
    | typeof DeleteCommentResponseSchema
    | typeof InternalServerErrorResponseSchema
  >
> {
  const parsedBodyResult = DeleteCommentRequestBodySchema.safeParse(
    await req.json()
  );

  if (!parsedBodyResult.success) {
    return new JSONResponse(
      BadRequestResponseSchema,
      parsedBodyResult.error.flatten().fieldErrors,
      { status: 400 }
    );
  }

  const { signTypedDataParams, appSignature, authorSignature } =
    parsedBodyResult.data;

  // Check that signature is from the app signer
  const appSigner = privateKeyToAccount(
    env.APP_SIGNER_PRIVATE_KEY! as `0x${string}`
  );

  // Can be any account with funds for gas on desired chain
  const submitterAccount = await resolveSubmitterAccount();

  const walletClient = createWalletClient({
    account: submitterAccount,
    chain,
    transport,
  }).extend(publicActions);

  const isAppSignatureValid = await walletClient.verifyTypedData({
    ...signTypedDataParams,
    signature: appSignature,
    address: appSigner.address,
  });

  if (!isAppSignatureValid) {
    console.log("verifying app signature failed", {
      ...signTypedDataParams,
      signature: appSignature,
      address: appSigner.address,
    });

    return new JSONResponse(
      BadRequestResponseSchema,
      { appSignature: ["Invalid app signature"] },
      { status: 400 }
    );
  }

  try {
    const txHash = await walletClient.writeContract({
      abi: CommentsV1Abi,
      address: COMMENTS_V1_ADDRESS,
      functionName: "deleteComment",
      args: [
        signTypedDataParams.message.commentId,
        signTypedDataParams.message.author,
        signTypedDataParams.message.appSigner,
        signTypedDataParams.message.nonce,
        signTypedDataParams.message.deadline,
        authorSignature,
        appSignature,
      ],
    });

    return new JSONResponse(DeleteCommentResponseSchema, { txHash });
  } catch (error) {
    console.error(error);

    return new JSONResponse(
      InternalServerErrorResponseSchema,
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}
