import { JSONResponse } from "@ecp.eth/shared/helpers";
import { createPublicClient, createWalletClient, publicActions } from "viem";
import {
  ApproveResponseSchema,
  BadRequestResponseSchema,
  ChangeApprovalStatusRequestBodySchema,
  InternalServerErrorResponseSchema,
} from "@/lib/schemas";
import { resolveSubmitterAccount } from "@/lib/submitter";
import { chain, privateTransport } from "@/lib/wagmi";
import { getApprovalStatusAndNonce } from "@/lib/contract";
import { addApprovalWithSig } from "@ecp.eth/sdk/comments";

export async function POST(
  req: Request,
): Promise<
  JSONResponse<
    | typeof BadRequestResponseSchema
    | typeof InternalServerErrorResponseSchema
    | typeof ApproveResponseSchema
  >
> {
  const parsedBodyResult = ChangeApprovalStatusRequestBodySchema.safeParse(
    await req.json(),
  );

  if (!parsedBodyResult.success) {
    return new JSONResponse(
      BadRequestResponseSchema,
      parsedBodyResult.error.flatten().fieldErrors,
      { status: 400 },
    );
  }

  const { authorSignature, signTypedDataParams, authorAddress } =
    parsedBodyResult.data;

  const publicClient = createPublicClient({
    chain,
    transport: privateTransport,
  });

  const verified = await publicClient.verifyTypedData({
    ...signTypedDataParams,
    address: authorAddress,
    signature: authorSignature,
  });

  if (!verified) {
    return new JSONResponse(
      BadRequestResponseSchema,
      { signTypedDataParams: ["Invalid signature"] },
      { status: 400 },
    );
  }

  // double check to avoid wasting gas on incorrect or unnecessary request
  // Check approval on chain and get nonce (multicall3 if available,
  // otherwise read contracts)
  const [{ result: isApproved }, { result: nonce }] =
    await getApprovalStatusAndNonce<typeof privateTransport, typeof chain>(
      publicClient,
      authorAddress,
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
  const submitterAccount = await resolveSubmitterAccount();

  const walletClient = createWalletClient({
    account: submitterAccount,
    chain,
    transport: privateTransport,
  }).extend(publicActions);

  try {
    const { txHash } = await addApprovalWithSig({
      signature: authorSignature,
      typedData: signTypedDataParams,
      writeContract: walletClient.writeContract,
    });

    return new JSONResponse(ApproveResponseSchema, { txHash });
  } catch (error) {
    console.error(error);

    return new JSONResponse(
      InternalServerErrorResponseSchema,
      { error: "Failed to add approval" },
      { status: 500 },
    );
  }
}
