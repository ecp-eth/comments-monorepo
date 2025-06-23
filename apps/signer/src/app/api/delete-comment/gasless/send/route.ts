import { getRpcUrl } from "@/lib/env";
import {
  GaslessNotAvailableError,
  getGaslessSigner,
  getGaslessSubmitter,
} from "@/lib/helpers";
import {
  BadRequestResponseSchema,
  ErrorResponseSchema,
  GaslessDeleteCommentRequestBodySchema,
  GaslessDeleteCommentResponseSchema,
} from "@/lib/schemas";
import { deleteCommentWithSig } from "@ecp.eth/sdk/comments";
import { JSONResponse } from "@ecp.eth/shared/helpers";
import { createWalletClient, http, publicActions } from "viem";

/**
 * Sends a gasless delete comment prepared by the `prepare` endpoint (/api/delete-comment/gasless/prepare).
 */
export async function POST(
  req: Request,
): Promise<
  JSONResponse<
    | typeof BadRequestResponseSchema
    | typeof GaslessDeleteCommentResponseSchema
    | typeof ErrorResponseSchema
  >
> {
  try {
    const parsedBodyResult = GaslessDeleteCommentRequestBodySchema.safeParse(
      await req.json(),
    );

    if (!parsedBodyResult.success) {
      return new JSONResponse(
        BadRequestResponseSchema,
        parsedBodyResult.error.flatten().fieldErrors,
        { status: 400 },
      );
    }

    const { signTypedDataParams, appSignature, authorSignature, chainConfig } =
      parsedBodyResult.data;

    // Check that signature is from the app signer
    const signer = await getGaslessSigner();

    // Can be any account with funds for gas on desired chain
    const submitterAccount = await getGaslessSubmitter();

    const walletClient = createWalletClient({
      account: submitterAccount,
      chain: chainConfig.chain,
      transport: http(getRpcUrl(chainConfig.chain.id)),
    }).extend(publicActions);

    const isAppSignatureValid = await walletClient.verifyTypedData({
      ...signTypedDataParams,
      signature: appSignature,
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
      ...signTypedDataParams.message,
      appSignature,
      authorSignature,
      writeContract: walletClient.writeContract,
    });

    return new JSONResponse(GaslessDeleteCommentResponseSchema, { txHash });
  } catch (error) {
    if (error instanceof GaslessNotAvailableError) {
      return new JSONResponse(
        ErrorResponseSchema,
        { error: "Not Found" },
        { status: 404 },
      );
    }

    console.error(error);

    return new JSONResponse(
      ErrorResponseSchema,
      { error: "Failed to delete comment" },
      { status: 500 },
    );
  }
}
