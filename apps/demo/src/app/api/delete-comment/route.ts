import { CommentsV1Abi } from "@modprotocol/comments-protocol-sdk/abis";
import { COMMENTS_V1_ADDRESS } from "@/lib/addresses";
import {
  bigintReplacer,
  createDeleteCommentTypedDataArgs,
  getNonce,
} from "@/lib/utils";
import {
  chains as configChains,
  transports as configTransports,
} from "@/lib/wagmi";
import { NextRequest } from "next/server";
import { createWalletClient, isAddress, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const chain = configChains[0];
const transport = configTransports[chain.id as keyof typeof configTransports];

export const GET = async (req: NextRequest) => {
  const { author: authorAddress, commentId } = await req.json();

  if (!authorAddress || !isAddress(authorAddress)) {
    console.error("Invalid address", authorAddress);
    return Response.json({ error: "Invalid address" }, { status: 400 });
  }

  if (!commentId) {
    console.error("Invalid commentId", commentId);
    return Response.json({ error: "Invalid commentId" }, { status: 400 });
  }

  const account = privateKeyToAccount(
    process.env.APP_SIGNER_PRIVATE_KEY! as `0x${string}`
  );

  const nonce = await getNonce({
    author: authorAddress,
    chain,
    transport,
  });

  // Construct deletion signature data
  const signTypedDataArgs = createDeleteCommentTypedDataArgs({
    commentId: commentId as `0x${string}`,
    chainId: chain.id,
    author: authorAddress,
    appSigner: account.address,
    nonce: nonce,
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
      functionName: "deleteComment",
      args: [
        signTypedDataArgs.message.commentId,
        signTypedDataArgs.message.author,
        signTypedDataArgs.message.appSigner,
        signTypedDataArgs.message.nonce,
        signTypedDataArgs.message.deadline,
        authorSignature,
        appSignature,
      ],
    });
    return Response.json({ txHash });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
};
