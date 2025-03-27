import { env } from "@/env";
import {
  ApproveResponseSchema,
  BadRequestResponseSchema,
  ChangeApprovalStatusRequestBodySchema,
  GetApprovalStatusApprovedSchema,
  GetApprovalStatusNotApprovedSchema,
  InternalServerErrorResponseSchema,
} from "@/lib/schemas";
import { resolveSubmitterAccount } from "@/lib/submitter";
import { bigintReplacer, JSONResponse } from "@ecp.eth/shared/helpers";
import { chain, transport } from "@/lib/wagmi";
import {
  COMMENTS_V1_ADDRESS,
  createApprovalTypedData,
  CommentsV1Abi,
} from "@ecp.eth/sdk";
import { NextRequest } from "next/server";
import {
  createPublicClient,
  createWalletClient,
  isAddress,
  publicActions,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

export async function GET(
  req: NextRequest
): Promise<
  JSONResponse<
    | typeof GetApprovalStatusApprovedSchema
    | typeof GetApprovalStatusNotApprovedSchema
    | typeof BadRequestResponseSchema
    | typeof InternalServerErrorResponseSchema
  >
> {
  const authorAddress = req.nextUrl.searchParams.get("author");

  if (!authorAddress || !isAddress(authorAddress)) {
    return new JSONResponse(
      BadRequestResponseSchema,
      { author: ["Invalid address"] },
      { status: 400 }
    );
  }

  const account = privateKeyToAccount(env.APP_SIGNER_PRIVATE_KEY);

  const publicClient = createPublicClient({
    chain,
    transport,
  });

  // Check approval on chain and get nonce (multicall3 if available, otherwise read contracts)
  const [{ result: isApproved }, { result: nonce }] = chain.contracts
    ?.multicall3
    ? await publicClient.multicall({
        contracts: [
          {
            address: COMMENTS_V1_ADDRESS,
            abi: CommentsV1Abi,
            functionName: "isApproved",
            args: [authorAddress, account.address],
          },
          {
            address: COMMENTS_V1_ADDRESS,
            abi: CommentsV1Abi,
            functionName: "nonces",
            args: [authorAddress, account.address],
          },
        ],
      })
    : (
        await Promise.all([
          publicClient.readContract({
            address: COMMENTS_V1_ADDRESS,
            abi: CommentsV1Abi,
            functionName: "isApproved",
            args: [authorAddress, account.address],
          }),
          publicClient.readContract({
            address: COMMENTS_V1_ADDRESS,
            abi: CommentsV1Abi,
            functionName: "nonces",
            args: [authorAddress, account.address],
          }),
        ])
      ).map((result) => ({ result }));

  if (isApproved) {
    return new JSONResponse(GetApprovalStatusApprovedSchema, {
      approved: true,
      appSigner: account.address,
    });
  }

  if (nonce === undefined) {
    return new JSONResponse(
      InternalServerErrorResponseSchema,
      { error: "Nonce could not be loaded" },
      { status: 500 }
    );
  }

  // Construct approval data
  const typedApprovalData = createApprovalTypedData({
    author: authorAddress,
    appSigner: account.address,
    chainId: chain.id,
    nonce: nonce as bigint,
  });

  const signature = await account.signTypedData(typedApprovalData);

  return new JSONResponse(
    GetApprovalStatusNotApprovedSchema,
    {
      signTypedDataParams: typedApprovalData,
      appSignature: signature,
      approved: false,
    },
    { jsonReplacer: bigintReplacer }
  );
}

export async function POST(
  req: Request
): Promise<
  JSONResponse<
    | typeof BadRequestResponseSchema
    | typeof InternalServerErrorResponseSchema
    | typeof ApproveResponseSchema
  >
> {
  const parsedBodyResult = ChangeApprovalStatusRequestBodySchema.safeParse(
    await req.json()
  );

  if (!parsedBodyResult.success) {
    return new JSONResponse(
      BadRequestResponseSchema,
      parsedBodyResult.error.flatten().fieldErrors,
      { status: 400 }
    );
  }

  const { signTypedDataParams, appSignature, authorSignature } =
    parsedBodyResult.data;

  // Check that signature is from the app signer
  const appSigner = privateKeyToAccount(env.APP_SIGNER_PRIVATE_KEY);

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
    address: appSigner.address,
  });

  if (!isAppSignatureValid) {
    console.log("verifying app signature failed", {
      ...signTypedDataParams,
      signature: appSignature,
      address: appSigner.address,
    });

    return new JSONResponse(
      BadRequestResponseSchema,
      { appSignature: ["Invalid app signature"] },
      { status: 400 }
    );
  }

  try {
    const txHash = await walletClient.writeContract({
      abi: CommentsV1Abi,
      address: COMMENTS_V1_ADDRESS,
      functionName: "addApproval",
      args: [
        signTypedDataParams.message.author,
        signTypedDataParams.message.appSigner,
        signTypedDataParams.message.nonce,
        signTypedDataParams.message.deadline,
        authorSignature,
      ],
    });

    return new JSONResponse(ApproveResponseSchema, { txHash });
  } catch (error) {
    console.error(error);

    return new JSONResponse(
      InternalServerErrorResponseSchema,
      { error: "Failed to add approval" },
      { status: 500 }
    );
  }
}
