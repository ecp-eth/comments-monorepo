import { CommentsV1Abi } from "@modprotocol/comments-protocol-sdk/abis";
import { COMMENTS_V1_ADDRESS } from "@/lib/addresses";
import { bigintReplacer, createApprovalSignTypedDataArgs } from "@/lib/utils";
import {
  chains as configChains,
  transports as configTransports,
} from "@/lib/wagmi";
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

export const GET = async (req: NextRequest) => {
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
            args: [authorAddress],
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
            args: [authorAddress],
          }),
        ])
      ).map((result) => ({ result }));

  if (isApproved) {
    return Response.json({
      approved: true,
      appSigner: account.address,
    });
  }

  if (nonce === undefined) {
    return Response.json(
      { error: "Nonce could not be loaded" },
      { status: 400 }
    );
  }

  // Construct approval data
  const signTypedDataArgs = createApprovalSignTypedDataArgs({
    author: authorAddress,
    appSigner: account.address,
    chainId: configChains[0].id,
    nonce: nonce as bigint,
  });

  const signature = await account.signTypedData(signTypedDataArgs);

  return Response.json({
    signTypedDataArgs: JSON.parse(
      JSON.stringify(signTypedDataArgs, bigintReplacer)
    ),
    appSignature: signature,
    approved: false,
  });
};

export const POST = async (req: Request) => {
  const { signTypedDataArgs, appSignature, authorSignature } = await req.json();

  if (!signTypedDataArgs || !appSignature || !authorSignature) {
    console.error("Missing required fields", {
      signTypedDataArgs,
      appSignature,
      authorSignature,
    });
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

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
    ...signTypedDataArgs,
    signature: appSignature,
    address: appSigner.address,
  });

  if (!isAppSignatureValid) {
    console.log("verifying app signature failed", {
      ...signTypedDataArgs,
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
        signTypedDataArgs.message.author,
        signTypedDataArgs.message.appSigner,
        signTypedDataArgs.message.nonce,
        signTypedDataArgs.message.deadline,
        authorSignature,
      ],
    });
    return Response.json({ txHash });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to add approval" }, { status: 500 });
  }
};
