import { env } from "@/env";
import { JSONResponse } from "@/lib/json-response";
import {
  BadRequestResponseSchema,
  InternalServerErrorResponseSchema,
  PreparedSignedGaslessDeleteCommentApprovedResponseSchema,
  PreparedSignedGaslessDeleteCommentNotApprovedResponseSchema,
  PrepareGaslessCommentDeletionRequestBodySchema,
} from "@/lib/schemas";
import { resolveSubmitterAccount } from "@/lib/submitter";
import { bigintReplacer } from "@ecp.eth/shared/helpers";
import { chain, transport } from "@/lib/wagmi";
import {
  COMMENTS_V1_ADDRESS,
  CommentsV1Abi,
  createDeleteCommentTypedData,
  getNonce,
} from "@ecp.eth/sdk";
import { createWalletClient, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export async function POST(
  req: Request
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
      { status: 400 }
    );
  }

  const {
    author: authorAddress,
    commentId,
    submitIfApproved,
  } = parsedBodyResult.data;

  const account = privateKeyToAccount(
    env.APP_SIGNER_PRIVATE_KEY! as `0x${string}`
  );

  const nonce = await getNonce({
    author: authorAddress,
    appSigner: account.address,
    chain,
    transport,
  });

  // Construct deletion signature data
  const typedDeleteCommentData = createDeleteCommentTypedData({
    commentId: commentId as `0x${string}`,
    chainId: chain.id,
    author: authorAddress,
    appSigner: account.address,
    nonce: nonce,
  });

  const signature = await account.signTypedData(typedDeleteCommentData);

  if (submitIfApproved) {
    const submitterAccount = await resolveSubmitterAccount();
    const walletClient = createWalletClient({
      account: submitterAccount,
      chain,
      transport,
    }).extend(publicActions);

    // Check approval on chain
    const isApproved = await walletClient.readContract({
      address: COMMENTS_V1_ADDRESS,
      abi: CommentsV1Abi,
      functionName: "isApproved",
      args: [authorAddress, account.address],
    });

    if (isApproved) {
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
          { status: 400 }
        );
      }

      try {
        const txHash = await walletClient.writeContract({
          abi: CommentsV1Abi,
          address: COMMENTS_V1_ADDRESS,
          functionName: "deleteComment",
          args: [
            commentId,
            authorAddress,
            account.address,
            nonce,
            typedDeleteCommentData.message.deadline,
            "0x",
            signature,
          ],
        });

        return new JSONResponse(
          PreparedSignedGaslessDeleteCommentApprovedResponseSchema,
          {
            txHash,
          }
        );
      } catch (error) {
        console.error(error);

        return new JSONResponse(
          InternalServerErrorResponseSchema,
          { error: "Failed to delete comment" },
          { status: 500 }
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
    }
  );
}
