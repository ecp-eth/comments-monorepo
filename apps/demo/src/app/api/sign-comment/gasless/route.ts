import { CommentsV1Abi } from "@ecp.eth/sdk/abis";
import { COMMENTS_V1_CONTRACT_ADDRESS } from "@ecp.eth/sdk";
import {
  chains as configChains,
  transports as configTransports,
} from "@/lib/wagmi";
import { createWalletClient, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createCommentSignTypedDataArgs } from "../../../../lib/utils";

export const POST = async (req: Request) => {
  let { commentData, appSignature, authorSignature } = await req.json();

  if (!commentData || !appSignature || !authorSignature) {
    console.error("Missing required fields", {
      commentData,
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

  const chain = configChains[0];
  const transport = configTransports[chain.id as keyof typeof configTransports];

  const walletClient = createWalletClient({
    account: submitterAccount,
    chain,
    transport,
  }).extend(publicActions);

  const signTypedDataArgs = createCommentSignTypedDataArgs({
    commentData,
    chainId: configChains[0].id,
  });

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
      address: COMMENTS_V1_CONTRACT_ADDRESS,
      functionName: "postComment",
      args: [
        {
          appSigner: commentData.appSigner,
          author: commentData.author,
          content: commentData.content,
          metadata: commentData.metadata,
          parentId: commentData.parentId,
          targetUri: commentData.targetUri,
          deadline: commentData.deadline,
          nonce: commentData.nonce,
        },
        authorSignature,
        appSignature,
      ],
    });
    return Response.json({ txHash });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to post comment" }, { status: 500 });
  }
};
