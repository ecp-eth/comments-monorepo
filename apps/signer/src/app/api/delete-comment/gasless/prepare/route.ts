import { getRpcUrl } from "@/lib/env";
import {
  BadRequestResponseSchema,
  ErrorResponseSchema,
  PreparedSignedGaslessDeleteCommentApprovedResponseSchema,
  PreparedSignedGaslessDeleteCommentNotApprovedResponseSchema,
  PrepareGaslessCommentDeletionRequestBodySchema,
} from "@/lib/schemas";
import { bigintReplacer, JSONResponse } from "@ecp.eth/shared/helpers";
import {
  createDeleteCommentTypedData,
  deleteCommentWithSig,
  isApproved,
} from "@ecp.eth/sdk/comments";
import { createWalletClient, publicActions } from "viem";
import {
  GaslessNotAvailableError,
  getGaslessSigner,
  getGaslessSubmitter,
} from "@/lib/helpers";
import { http } from "viem";

/**
 * Prepares a gasless delete comment operation
 */
export async function POST(
  req: Request,
): Promise<
  JSONResponse<
    | typeof BadRequestResponseSchema
    | typeof PreparedSignedGaslessDeleteCommentApprovedResponseSchema
    | typeof PreparedSignedGaslessDeleteCommentNotApprovedResponseSchema
  >
> {
  try {
    const parsedBodyResult =
      PrepareGaslessCommentDeletionRequestBodySchema.safeParse(
        await req.json(),
      );

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
      chainConfig,
    } = parsedBodyResult.data;

    const signer = await getGaslessSigner();

    // Construct deletion signature data
    const typedDeleteCommentData = createDeleteCommentTypedData({
      commentId: commentId as `0x${string}`,
      chainId: chainConfig.chain.id,
      author: authorAddress,
      app: signer.address,
    });

    const signature = await signer.signTypedData(typedDeleteCommentData);

    if (submitIfApproved) {
      const submitter = await getGaslessSubmitter();
      const walletClient = createWalletClient({
        account: submitter,
        chain: chainConfig.chain,
        transport: http(getRpcUrl(chainConfig.chain.id)),
      }).extend(publicActions);

      // Check approval on chain
      const hasApproval = await isApproved({
        app: signer.address,
        author: authorAddress,
        readContract: walletClient.readContract,
      });

      if (hasApproval) {
        // Verify app signature
        const isAppSignatureValid = await walletClient.verifyTypedData({
          ...typedDeleteCommentData,
          signature,
          address: signer.address,
        });

        if (!isAppSignatureValid) {
          return new JSONResponse(
            BadRequestResponseSchema,
            { appSignature: ["Invalid app signature"] },
            { status: 400 },
          );
        }

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
  } catch (e) {
    if (e instanceof GaslessNotAvailableError) {
      return new JSONResponse(
        ErrorResponseSchema,
        { error: "Not Found" },
        { status: 404 },
      );
    }

    console.error("Error in gasless delete comment prepare endpoint:", e);

    return new JSONResponse(
      ErrorResponseSchema,
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
