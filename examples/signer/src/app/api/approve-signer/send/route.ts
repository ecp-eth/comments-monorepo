import { JSONResponse } from "@ecp.eth/shared/helpers";
import { createPublicClient, createWalletClient, http } from "viem";
import { getApprovalAndNonce } from "@ecp.eth/shared/helpers/getApprovalAndNonce";
import { addApprovalWithSig } from "@ecp.eth/sdk/comments";
import {
  guardAPIDeadline,
  guardAuthorIsNotMuted,
  guardAuthorSignature,
  guardRateLimitNotExceeded,
} from "@/lib/guards";
import { getGaslessSigner, getGaslessSubmitter } from "@/lib/helpers";
import { getRpcUrl } from "@/lib/env";
import { SendApproveSignerRequestPayloadRestrictedSchema } from "@/lib/schemas/approve";
import {
  BadRequestResponseBodySchema,
  ErrorResponseBodySchema,
} from "@ecp.eth/shared/schemas/signer-api/shared";
import { SendApproveSignerResponseBodySchema } from "@ecp.eth/shared/schemas/signer-api/approve";

export async function POST(
  req: Request,
): Promise<
  JSONResponse<
    | typeof SendApproveSignerResponseBodySchema
    | typeof BadRequestResponseBodySchema
    | typeof ErrorResponseBodySchema
  >
> {
  try {
    const parsedBodyResult =
      SendApproveSignerRequestPayloadRestrictedSchema.safeParse(
        await req.json(),
      );

    if (!parsedBodyResult.success) {
      return new JSONResponse(
        BadRequestResponseBodySchema,
        parsedBodyResult.error.flatten().fieldErrors,
        { status: 400 },
      );
    }

    const { authorSignature, signTypedDataParams, authorAddress, chainConfig } =
      parsedBodyResult.data;
    const { author, deadline } = signTypedDataParams.message;

    guardAPIDeadline(deadline);
    await guardRateLimitNotExceeded(author);
    await guardAuthorIsNotMuted(author);

    const chain = chainConfig.chain;
    const transport = http(getRpcUrl(chain.id));
    const publicClient = createPublicClient({
      chain,
      transport,
    });

    // Sanity check typed-data domain vs selected chain
    if (signTypedDataParams.domain.chainId !== chain.id) {
      return new JSONResponse(
        BadRequestResponseBodySchema,
        { signTypedDataParams: ["Incorrect chainId in typed-data domain"] },
        { status: 400 },
      );
    }

    await guardAuthorSignature({
      publicClient,
      authorSignature,
      signTypedDataParams,
      authorAddress,
      request: req,
    });

    const appSignerAccount = await getGaslessSigner();

    // double check to avoid wasting gas on incorrect or unnecessary request
    // Check approval on chain and get nonce (multicall3 if available,
    // otherwise read contracts)
    const [{ result: isApproved }, { result: nonce }] =
      await getApprovalAndNonce(
        publicClient,
        authorAddress,
        appSignerAccount.address,
        chain,
      );

    if (isApproved) {
      return new JSONResponse(
        BadRequestResponseBodySchema,
        { signTypedDataParams: ["Already approved"] },
        {
          status: 400,
        },
      );
    }

    if (nonce !== signTypedDataParams.message.nonce) {
      return new JSONResponse(
        BadRequestResponseBodySchema,
        { signTypedDataParams: ["Incorrect nonce"] },
        {
          status: 400,
        },
      );
    }

    // Can be any account with funds for gas on desired chain
    const submitterAccount = await getGaslessSubmitter();

    const walletClient = createWalletClient({
      account: submitterAccount,
      chain,
      transport,
    });

    const { txHash } = await addApprovalWithSig({
      signature: authorSignature,
      typedData: signTypedDataParams,
      writeContract: walletClient.writeContract,
    });

    return new JSONResponse(SendApproveSignerResponseBodySchema, { txHash });
  } catch (error) {
    if (error instanceof JSONResponse) {
      return error;
    }

    console.error(error);

    return new JSONResponse(
      ErrorResponseBodySchema,
      { error: "Failed to add approval" },
      { status: 500 },
    );
  }
}
