import {
  ChangeApprovalStatusRequestBodySchema,
  GetApprovalStatusApprovedSchema,
  GetApprovalStatusNotApprovedSchema,
  type GetApprovalStatusSchemaType,
} from "@/lib/schemas";
import { bigintReplacer } from "@/lib/utils";
import {
  chains as configChains,
  transports as configTransports,
} from "@/lib/wagmi";
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

const chain = configChains[0];
const transport = configTransports[chain.id as keyof typeof configTransports];

export async function GET(req: NextRequest) {
  const authorAddress = req.nextUrl.searchParams.get("author");

  if (!authorAddress || !isAddress(authorAddress)) {
    console.error("Invalid address", authorAddress);
    return Response.json({ error: "Invalid address" }, { status: 400 });
  }

  const account = privateKeyToAccount(
    process.env.APP_SIGNER_PRIVATE_KEY! as `0x${string}`
  );

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
    return Response.json(
      GetApprovalStatusApprovedSchema.parse({
        approved: true,
        appSigner: account.address,
      }) satisfies GetApprovalStatusSchemaType
    );
  }

  if (nonce === undefined) {
    return Response.json(
      { error: "Nonce could not be loaded" },
      { status: 400 }
    );
  }

  // Construct approval data
  const typedApprovalData = createApprovalTypedData({
    author: authorAddress,
    appSigner: account.address,
    chainId: configChains[0].id,
    nonce: nonce as bigint,
  });

  const signature = await account.signTypedData(typedApprovalData);

  return new Response(
    JSON.stringify(
      GetApprovalStatusNotApprovedSchema.parse({
        signTypedDataParams: typedApprovalData,
        appSignature: signature,
        approved: false,
      }) satisfies GetApprovalStatusSchemaType,
      bigintReplacer
    ),
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

export async function POST(req: Request) {
  const parsedBodyResult = ChangeApprovalStatusRequestBodySchema.safeParse(
    await req.json()
  );

  if (!parsedBodyResult.success) {
    return Response.json(parsedBodyResult.error.flatten(), { status: 400 });
  }

  const { signTypedDataParams, appSignature, authorSignature } =
    parsedBodyResult.data;

  // Check that signature is from the app signer
  const appSigner = privateKeyToAccount(
    process.env.APP_SIGNER_PRIVATE_KEY! as `0x${string}`
  );

  // Can be any account with funds for gas on desired chain
  const submitterAccount = privateKeyToAccount(
    process.env.SUBMITTER_PRIVATE_KEY! as `0x${string}`
  );

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

    return Response.json({ error: "Invalid app signature" }, { status: 400 });
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
    return Response.json({ txHash });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to add approval" }, { status: 500 });
  }
}
