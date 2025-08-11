import { getRpcUrl } from "@/lib/env";
import {
  GaslessNotAvailableError,
  getGaslessSigner,
  getGaslessSubmitter,
} from "@/lib/helpers";
import {
  BadRequestResponseSchema,
  ErrorResponseSchema,
  GaslessPostCommentRequestBodySchema,
  GaslessPostCommentResponseSchema,
} from "@/lib/schemas";
import { postCommentWithSig } from "@ecp.eth/sdk/comments";
import { JSONResponse } from "@ecp.eth/shared/helpers";
import { createWalletClient, http, publicActions } from "viem";

/**
 * Sends a gasless comment prepared by the `prepare` endpoint (/api/gasless/prepare).
 */
export async function POST(
  req: Request,
): Promise<
  JSONResponse<typeof ErrorResponseSchema | typeof BadRequestResponseSchema>
> {
  try {
    const parsedBodyResult = GaslessPostCommentRequestBodySchema.safeParse(
      await req.json(),
    );

    if (!parsedBodyResult.success) {
      return new JSONResponse(
        BadRequestResponseSchema,
        parsedBodyResult.error.flatten().fieldErrors,
      );
    }

    const { signTypedDataParams, appSignature, authorSignature, chainConfig } =
      parsedBodyResult.data;

    const signer = await getGaslessSigner();
    const submitter = await getGaslessSubmitter();

    const walletClient = createWalletClient({
      account: submitter,
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
        { signature: ["Invalid app signature"] },
        { status: 400 },
      );
    }

    const { txHash } = await postCommentWithSig({
      appSignature,
      authorSignature,
      comment: signTypedDataParams.message,
      writeContract: walletClient.writeContract,
    });

    return new JSONResponse(GaslessPostCommentResponseSchema, { txHash });
  } catch (e) {
    if (e instanceof GaslessNotAvailableError) {
      return new JSONResponse(
        ErrorResponseSchema,
        { error: "Not Found" },
        { status: 404 },
      );
    }

    console.error("Error in gasless post comment send endpoint:", e);

    return new JSONResponse(
      ErrorResponseSchema,
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
