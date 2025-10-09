import { getChainById, JSONResponse } from "@ecp.eth/shared/helpers";
import { createPublicClient, createWalletClient } from "viem";
import {
  AddApprovalResponseSchema,
  BadRequestResponseSchema,
  AddApprovalStatusRequestBodySchema,
  InternalServerErrorResponseSchema,
} from "@/lib/schemas";
import { privateTransport } from "@/lib/serverWagmi";
import { getApprovalAndNonce } from "@ecp.eth/shared/helpers/getApprovalAndNonce";
import { addApprovalWithSig } from "@ecp.eth/sdk/comments";
import { publicEnv } from "@/publicEnv";
import { supportedChains } from "@/lib/wagmi";
import never from "never";
import { guardAuthorSignature, guardNoSubmitterPrivateKey } from "@/lib/guards";
import { privateKeyToAccount } from "viem/accounts";

export async function POST(
  req: Request,
): Promise<
  JSONResponse<
    | typeof BadRequestResponseSchema
    | typeof InternalServerErrorResponseSchema
    | typeof AddApprovalResponseSchema
  >
> {
  try {
    const parsedBodyResult = AddApprovalStatusRequestBodySchema.safeParse(
      await req.json(),
    );

    if (!parsedBodyResult.success) {
      return new JSONResponse(
        BadRequestResponseSchema,
        parsedBodyResult.error.flatten().fieldErrors,
        { status: 400 },
      );
    }

    const { authorSignature, signTypedDataParams, authorAddress, chainId } =
      parsedBodyResult.data;
    const chain =
      getChainById(chainId, supportedChains) ?? never("Chain not found");

    const publicClient = createPublicClient({
      chain,
      transport: privateTransport,
    });

    await guardAuthorSignature({
      publicClient,
      authorSignature,
      signTypedDataParams,
      authorAddress,
    });
    const submitterPrivateKey = guardNoSubmitterPrivateKey();

    // double check to avoid wasting gas on incorrect or unnecessary request
    // Check approval on chain and get nonce (multicall3 if available,
    // otherwise read contracts)
    const [{ result: isApproved }, { result: nonce }] =
      await getApprovalAndNonce<typeof privateTransport, typeof chain>(
        publicClient,
        authorAddress,
        publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
        chain,
      );

    if (isApproved) {
      return new JSONResponse(
        BadRequestResponseSchema,
        { signTypedDataParams: ["Already approved"] },
        {
          status: 400,
        },
      );
    }

    if (nonce !== signTypedDataParams.message.nonce) {
      return new JSONResponse(
        BadRequestResponseSchema,
        { signTypedDataParams: ["Incorrect nonce"] },
        {
          status: 400,
        },
      );
    }

    // Can be any account with funds for gas on desired chain
    const submitterAccount = privateKeyToAccount(submitterPrivateKey);

    const walletClient = createWalletClient({
      account: submitterAccount,
      chain,
      transport: privateTransport,
    });

    const { txHash } = await addApprovalWithSig({
      signature: authorSignature,
      typedData: signTypedDataParams,
      writeContract: walletClient.writeContract,
    });

    return new JSONResponse(AddApprovalResponseSchema, { txHash });
  } catch (error) {
    if (error instanceof JSONResponse) {
      return error;
    }

    console.error(error);

    return new JSONResponse(
      InternalServerErrorResponseSchema,
      { error: "Failed to add approval" },
      { status: 500 },
    );
  }
}
