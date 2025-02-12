import { submitterAccount } from "@/lib/privy";
import { bigintReplacer } from "@/lib/utils";
import {
  chains as configChains,
  transports as configTransports,
} from "@/lib/wagmi";
import {
  COMMENTS_V1_ADDRESS,
  CommentsV1Abi,
  createCommentData,
  createCommentSignTypedDataArgs,
  getNonce,
} from "@ecp.eth/sdk";
import { createWalletClient, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const POST = async (req: Request) => {
  let { content, targetUri, parentId, author, submitIfApproved } =
    await req.json();

  // Validate target URL is valid
  if (!targetUri.startsWith(process.env.APP_URL!)) {
    return Response.json({ error: "Invalid target URL" }, { status: 400 });
  }

  const account = privateKeyToAccount(
    process.env.APP_SIGNER_PRIVATE_KEY! as `0x${string}`
  );
  const chain = configChains[0];
  const transport = configTransports[chain.id];

  const nonce = await getNonce({
    author,
    appSigner: account.address,
    chain,
    transport,
  });

  const commentData = createCommentData({
    content,
    targetUri,
    parentId,
    author,
    appSigner: account.address,
    nonce,
  });

  const signTypedDataArgs = createCommentSignTypedDataArgs({
    commentData,
    chainId: configChains[0].id,
  });

  const signature = await account.signTypedData(signTypedDataArgs);

  if (submitIfApproved) {
    const walletClient = createWalletClient({
      account: await submitterAccount,
      chain,
      transport,
    }).extend(publicActions);

    // Check approval on chain
    const isApproved = await walletClient.readContract({
      address: COMMENTS_V1_ADDRESS,
      abi: CommentsV1Abi,
      functionName: "isApproved",
      args: [author, account.address],
    });

    if (isApproved) {
      // Verify app signature
      const isAppSignatureValid = await walletClient.verifyTypedData({
        ...signTypedDataArgs,
        signature,
        address: account.address,
      });

      if (!isAppSignatureValid) {
        console.error("Invalid app signature");
        return Response.json(
          { error: "Invalid app signature" },
          { status: 400 }
        );
      }

      try {
        const txHash = await walletClient.writeContract({
          abi: CommentsV1Abi,
          address: COMMENTS_V1_ADDRESS,
          functionName: "postComment",
          args: [commentData, "0x", signature],
        });
        return Response.json({ txHash });
      } catch (error) {
        console.error(error);
        return Response.json(
          { error: "Failed to post comment" },
          { status: 500 }
        );
      }
    }
  }

  const res = {
    signTypedDataArgs: JSON.parse(
      JSON.stringify(signTypedDataArgs, bigintReplacer)
    ),
    appSignature: signature,
  };

  return Response.json(res);
};
