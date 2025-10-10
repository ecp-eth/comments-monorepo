import { env } from "@/env";
import {
  BadRequestResponseSchema,
  InternalServerErrorResponseSchema,
  PreparedSignedGaslessDeleteCommentApprovedResponseSchema,
  PreparedSignedGaslessDeleteCommentNotApprovedResponseSchema,
  PrepareGaslessCommentDeletionRequestBodySchema,
} from "@/lib/schemas";
import { resolveSubmitterAccount } from "@/lib/submitter";
import { bigintReplacer, JSONResponse } from "@ecp.eth/shared/helpers";
import { chain, privateTransport } from "@/lib/serverWagmi";
import {
  createDeleteCommentTypedData,
  deleteCommentWithSig,
  isApproved,
} from "@ecp.eth/sdk/comments";
import { createWalletClient, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export async function POST(
  req: Request,
): Promise<
  JSONResponse<
    | typeof BadRequestResponseSchema
    | typeof InternalServerErrorResponseSchema
    | typeof PreparedSignedGaslessDeleteCommentApprovedResponseSchema
    | typeof PreparedSignedGaslessDeleteCommentNotApprovedResponseSchema
  >
> {
  const parsedBodyResult =
    PrepareGaslessCommentDeletionRequestBodySchema.safeParse(await req.json());

  if (!parsedBodyResult.success) {
    return new JSONResponse(
      BadRequestResponseSchema,
      parsedBodyResult.error.flatten().fieldErrors,
      { status: 400 },
    );
  }

  const {
    author: authorAddress,
    commentId,
    submitIfApproved,
  } = parsedBodyResult.data;

  const account = privateKeyToAccount(
    env.APP_SIGNER_PRIVATE_KEY! as `0x${string}`,
  );

  // Construct deletion signature data
  const typedDeleteCommentData = createDeleteCommentTypedData({
    commentId: commentId as `0x${string}`,
    chainId: chain.id,
    author: authorAddress,
    app: account.address,
  });

  const signature = await account.signTypedData(typedDeleteCommentData);

  if (submitIfApproved && env.NEXT_PUBLIC_ENABLE_PREAPPROVED_GASLESS) {
    const submitterAccount = await resolveSubmitterAccount();
    const walletClient = createWalletClient({
      account: submitterAccount,
      chain,
      transport: privateTransport,
    }).extend(publicActions);

    // Check approval on chain
    const hasApproval = await isApproved({
      app: account.address,
      author: authorAddress,
      readContract: walletClient.readContract,
    });

    if (hasApproval) {
      // Verify app signature
      const isAppSignatureValid = await walletClient.verifyTypedData({
        ...typedDeleteCommentData,
        signature,
        address: account.address,
      });

      if (!isAppSignatureValid) {
        return new JSONResponse(
          BadRequestResponseSchema,
          { appSignature: ["Invalid app signature"] },
          { status: 400 },
        );
      }

      try {
        const { txHash } = await deleteCommentWithSig({
          ...typedDeleteCommentData.message,
          appSignature: signature,
          writeContract: walletClient.writeContract,
        });

        return new JSONResponse(
          PreparedSignedGaslessDeleteCommentApprovedResponseSchema,
          {
            txHash,
          },
        );
      } catch (error) {
        console.error(error);

        return new JSONResponse(
          InternalServerErrorResponseSchema,
          { error: "Failed to delete comment" },
          { status: 500 },
        );
      }
    }
  }

  return new JSONResponse(
    PreparedSignedGaslessDeleteCommentNotApprovedResponseSchema,
    {
      signTypedDataParams: typedDeleteCommentData,
      appSignature: signature,
    },
    {
      jsonReplacer: bigintReplacer,
    },
  );
}
