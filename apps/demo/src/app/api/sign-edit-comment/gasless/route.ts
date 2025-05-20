import { env } from "@/env";
import {
  BadRequestResponseSchema,
  GaslessEditRequestBodySchema,
  GaslessEditResponseSchema,
  InternalServerErrorResponseSchema,
} from "@/lib/schemas";
import { resolveSubmitterAccount } from "@/lib/submitter";
import { chain, transport } from "@/lib/wagmi";
import { editCommentWithApproval } from "@ecp.eth/sdk/comments";
import { JSONResponse } from "@ecp.eth/shared/helpers";
import { createWalletClient, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export async function POST(
  req: Request,
): Promise<
  JSONResponse<
    | typeof GaslessEditResponseSchema
    | typeof BadRequestResponseSchema
    | typeof InternalServerErrorResponseSchema
  >
> {
  const parsedBodyResult = GaslessEditRequestBodySchema.safeParse(
    await req.json(),
  );

  if (!parsedBodyResult.success) {
    return new JSONResponse(
      BadRequestResponseSchema,
      parsedBodyResult.error.flatten().fieldErrors,
      { status: 400 },
    );
  }

  const { signTypedDataParams, appSignature, authorSignature, edit } =
    parsedBodyResult.data;

  // Check that signature is from the app signer
  const app = privateKeyToAccount(env.APP_SIGNER_PRIVATE_KEY);

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
      { signature: ["Invalid app signature"] },
      { status: 400 },
    );
  }

  try {
    const { txHash } = await editCommentWithApproval({
      appSignature,
      authorSignature,
      edit,
      writeContract: walletClient.writeContract,
    });

    return new JSONResponse(GaslessEditResponseSchema, { txHash });
  } catch (error) {
    console.error(error);

    return new JSONResponse(
      InternalServerErrorResponseSchema,
      { error: "Failed to edit comment" },
      { status: 500 },
    );
  }
}
