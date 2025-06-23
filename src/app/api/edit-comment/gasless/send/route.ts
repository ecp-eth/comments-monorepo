import {
  GaslessNotAvailableError,
  getGaslessSigner,
  getGaslessSubmitter,
} from "@/lib/helpers";
import {
  BadRequestResponseSchema,
  ErrorResponseSchema,
  GaslessEditRequestBodySchema,
  GaslessEditResponseSchema,
} from "@/lib/schemas";
import { editCommentWithSig } from "@ecp.eth/sdk/comments";
import { JSONResponse } from "@ecp.eth/shared/helpers";
import { createWalletClient, http, publicActions } from "viem";
import { getRpcUrl } from "@/lib/env";

/**
 * Sends a gasless edit comment prepared by the `prepare` endpoint (/api/edit-comment/gasless/prepare).
 */
export async function POST(
  req: Request,
): Promise<
  JSONResponse<typeof ErrorResponseSchema | typeof BadRequestResponseSchema>
> {
  try {
    const parsedBodyResult = GaslessEditRequestBodySchema.safeParse(
      await req.json(),
    );

    if (!parsedBodyResult.success) {
      return new JSONResponse(
        BadRequestResponseSchema,
        parsedBodyResult.error.flatten().fieldErrors,
      );
    }

    const {
      signTypedDataParams,
      appSignature,
      authorSignature,
      edit,
      chainConfig,
    } = parsedBodyResult.data;

    const signer = await getGaslessSigner();
    const submitter = await getGaslessSubmitter();

    const submitterWalletClient = createWalletClient({
      account: submitter,
      chain: chainConfig.chain,
      transport: http(getRpcUrl(chainConfig.chain.id)),
    }).extend(publicActions);

    const isAppSignatureValid = await submitterWalletClient.verifyTypedData({
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

    const { txHash } = await editCommentWithSig({
      appSignature,
      authorSignature,
      edit,
      writeContract: submitterWalletClient.writeContract,
    });

    return new JSONResponse(GaslessEditResponseSchema, { txHash });
  } catch (e) {
    if (e instanceof GaslessNotAvailableError) {
      return new JSONResponse(
        ErrorResponseSchema,
        { error: "Not Found" },
        { status: 404 },
      );
    }

    console.error("Error in gasless edit comment send endpoint:", e);

    return new JSONResponse(
      ErrorResponseSchema,
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
