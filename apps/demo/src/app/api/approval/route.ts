import { JSONResponse } from "@ecp.eth/shared/helpers";
import { COMMENTS_V1_ADDRESS, CommentsV1Abi } from "@ecp.eth/sdk";
import {
  createPublicClient,
  createWalletClient,
  hashMessage,
  hashTypedData,
  publicActions,
  recoverAddress,
} from "viem";
import {
  ApproveResponseSchema,
  BadRequestResponseSchema,
  ChangeApprovalStatusRequestBodySchema,
  InternalServerErrorResponseSchema,
} from "@/lib/schemas";
import { resolveSubmitterAccount } from "@/lib/submitter";
import { chain, transport } from "@/lib/wagmi";
import { privateKeyToAccount } from "viem/accounts";
import { env } from "@/env";

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

  const { signTypedDataParams, authorSignature } = parsedBodyResult.data;

  const hash = hashTypedData(signTypedDataParams);
  const authorAddress = await recoverAddress({
    hash,
    signature: authorSignature,
  });
  const account = privateKeyToAccount(env.APP_SIGNER_PRIVATE_KEY);
  const publicClient = createPublicClient({
    chain,
    transport,
  });

  // double check to avoid wasting gas on incorrect or unnecessary request
  // Check approval on chain and get nonce (multicall3 if available,
  // otherwise read contracts)
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
    return new JSONResponse(
      BadRequestResponseSchema,
      { signTypedDataParams: ["Already approved"] },
      {
        status: 400,
      }
    );
  }

  if (nonce !== signTypedDataParams.message.nonce) {
    return new JSONResponse(
      BadRequestResponseSchema,
      { signTypedDataParams: ["Incorrect nonce"] },
      {
        status: 400,
      }
    );
  }

  // Can be any account with funds for gas on desired chain
  const submitterAccount = await resolveSubmitterAccount();

  const walletClient = createWalletClient({
    account: submitterAccount,
    chain,
    transport,
  }).extend(publicActions);

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
