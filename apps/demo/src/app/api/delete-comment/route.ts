import { env } from "@/env";
import {
  BadRequestResponseSchema,
  DeleteCommentRequestBodySchema,
  DeleteCommentResponseSchema,
  InternalServerErrorResponseSchema,
} from "@/lib/schemas";
import { resolveSubmitterAccount } from "@/lib/submitter";
import { chain, transport } from "@/lib/wagmi";
import { deleteCommentWithSig } from "@ecp.eth/sdk/comments";
import { JSONResponse } from "@ecp.eth/shared/helpers";
import { createWalletClient, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export async function POST(
  req: Request,
): Promise<
  JSONResponse<
    | typeof BadRequestResponseSchema
    | typeof DeleteCommentResponseSchema
    | typeof InternalServerErrorResponseSchema
  >
> {
  const parsedBodyResult = DeleteCommentRequestBodySchema.safeParse(
    await req.json(),
  );

  if (!parsedBodyResult.success) {
    return new JSONResponse(
      BadRequestResponseSchema,
      parsedBodyResult.error.flatten().fieldErrors,
      { status: 400 },
    );
  }

  const { signTypedDataParams, appSignature, authorSignature } =
    parsedBodyResult.data;

  // Check that signature is from the app signer
  const app = privateKeyToAccount(env.APP_SIGNER_PRIVATE_KEY! as `0x${string}`);

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
    address: app.address,
  });

  if (!isAppSignatureValid) {
    console.log("verifying app signature failed", {
      ...signTypedDataParams,
      signature: appSignature,
      address: app.address,
    });

    return new JSONResponse(
      BadRequestResponseSchema,
      { appSignature: ["Invalid app signature"] },
      { status: 400 },
    );
  }

  try {
    const { txHash } = await deleteCommentWithSig({
      ...signTypedDataParams.message,
      appSignature,
      authorSignature,
      writeContract: walletClient.writeContract,
    });

    return new JSONResponse(DeleteCommentResponseSchema, { txHash });
  } catch (error) {
    console.error(error);

    return new JSONResponse(
      InternalServerErrorResponseSchema,
      { error: "Failed to delete comment" },
      { status: 500 },
    );
  }
}
