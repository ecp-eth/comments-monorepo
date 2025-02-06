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
import { createWalletClient, isAddress, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const chain = configChains[0];
const transport = configTransports[chain.id as keyof typeof configTransports];

export const POST = async (req: Request) => {
  const {
    author: authorAddress,
    commentId,
    submitIfApproved,
  } = await req.json();

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

  console.log("nonce", nonce);

  // Construct deletion signature data
  const signTypedDataArgs = createDeleteCommentTypedDataArgs({
    commentId: commentId as `0x${string}`,
    chainId: chain.id,
    author: authorAddress,
    appSigner: account.address,
    nonce: nonce,
  });

  const signature = await account.signTypedData(signTypedDataArgs);

  if (submitIfApproved) {
    const submitterAccount = privateKeyToAccount(
      process.env.SUBMITTER_PRIVATE_KEY! as `0x${string}`
    );
    const walletClient = createWalletClient({
      account: submitterAccount,
      chain,
      transport,
    }).extend(publicActions);

    // Check approval on chain
    const isApproved = await walletClient.readContract({
      address: COMMENTS_V1_ADDRESS,
      abi: CommentsV1Abi,
      functionName: "isApproved",
      args: [authorAddress, account.address],
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
          functionName: "deleteComment",
          args: [
            commentId,
            authorAddress,
            account.address,
            nonce,
            signTypedDataArgs.message.deadline,
            "0x",
            signature,
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
    }
  }

  return Response.json({
    signTypedDataArgs: JSON.parse(
      JSON.stringify(signTypedDataArgs, bigintReplacer)
    ),
    appSignature: signature,
  });
};
