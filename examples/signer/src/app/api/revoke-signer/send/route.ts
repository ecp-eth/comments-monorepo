import { createPublicClient, createWalletClient, http } from "viem";
import { JSONResponse } from "@ecp.eth/shared-signer/helpers/response";
import { getApprovalAndNonce } from "@ecp.eth/shared-signer/helpers/ecp";
import { revokeApprovalWithSig } from "@ecp.eth/sdk/comments";
import {
  guardAPIDeadline,
  guardAuthorIsNotMuted,
  guardAuthorSignature,
  guardRateLimitNotExceeded,
} from "@/lib/guards";
import { getGaslessSigner, getGaslessSubmitter } from "@/lib/helpers";
import { getRpcUrl } from "@/lib/env";
import { SendRevokeSignerRequestPayloadRestrictedSchema } from "@/lib/schemas/revoke";
import {
  BadRequestResponseBodySchema,
  ErrorResponseBodySchema,
} from "@ecp.eth/shared-signer/schemas/signer-api/shared";
import { SendRevokeSignerResponseBodySchema } from "@ecp.eth/shared-signer/schemas/signer-api/revoke";

export async function POST(
  req: Request,
): Promise<
  JSONResponse<
    | typeof SendRevokeSignerResponseBodySchema
    | typeof BadRequestResponseBodySchema
    | typeof ErrorResponseBodySchema
  >
> {
  try {
    const parsedBodyResult =
      SendRevokeSignerRequestPayloadRestrictedSchema.safeParse(
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

    if (!isApproved) {
      return new JSONResponse(
        BadRequestResponseBodySchema,
        { signTypedDataParams: ["No need to revoke approval"] },
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

    if (appSignerAccount.address !== signTypedDataParams.message.app) {
      return new JSONResponse(
        BadRequestResponseBodySchema,
        { signTypedDataParams: ["app address not allowed"] },
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

    const { txHash } = await revokeApprovalWithSig({
      signature: authorSignature,
      typedData: signTypedDataParams,
      writeContract: walletClient.writeContract,
    });

    return new JSONResponse(SendRevokeSignerResponseBodySchema, { txHash });
  } catch (error) {
    if (error instanceof JSONResponse) {
      return error;
    }

    console.error(error);

    return new JSONResponse(
      ErrorResponseBodySchema,
      { error: "Failed to revoke approval" },
      { status: 500 },
    );
  }
}
