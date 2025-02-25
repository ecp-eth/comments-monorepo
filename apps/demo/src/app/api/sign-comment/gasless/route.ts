import {
  GaslessPostCommentRequestBodySchema,
  GaslessPostCommentResponseSchema,
} from "@/lib/schemas";
import {
  chains as configChains,
  transports as configTransports,
} from "@/lib/wagmi";
import { COMMENTS_V1_ADDRESS, CommentsV1Abi } from "@ecp.eth/sdk";
import { createWalletClient, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const POST = async (req: Request) => {
  const parsedBodyResult = GaslessPostCommentRequestBodySchema.safeParse(
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

  const chain = configChains[0];
  const transport = configTransports[chain.id as keyof typeof configTransports];

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
      functionName: "postComment",
      args: [
        {
          appSigner: signTypedDataParams.message.appSigner,
          author: signTypedDataParams.message.author,
          content: signTypedDataParams.message.content,
          metadata: signTypedDataParams.message.metadata,
          parentId: signTypedDataParams.message.parentId,
          targetUri: signTypedDataParams.message.targetUri,
          deadline: signTypedDataParams.message.deadline,
          nonce: signTypedDataParams.message.nonce,
        },
        authorSignature,
        appSignature,
      ],
    });
    return Response.json(GaslessPostCommentResponseSchema.parse({ txHash }));
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to post comment" }, { status: 500 });
  }
};
