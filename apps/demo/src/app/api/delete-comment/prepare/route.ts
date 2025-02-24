import {
  PreparedGaslessCommentOperationApprovedSchema,
  type PreparedGaslessCommentOperationSchemaType,
  PreparedSignedGaslessCommentOperationNotApprovedSchema,
  PrepareGaslessCommentDeletionRequestBodySchema,
} from "@/lib/schemas";
import { bigintReplacer } from "@/lib/utils";
import {
  chains as configChains,
  transports as configTransports,
} from "@/lib/wagmi";
import {
  COMMENTS_V1_ADDRESS,
  CommentsV1Abi,
  createDeleteCommentTypedData,
  getNonce,
} from "@ecp.eth/sdk";
import { createWalletClient, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const chain = configChains[0];
const transport = configTransports[chain.id as keyof typeof configTransports];

export async function POST(req: Request) {
  const parsedBodyResult =
    PrepareGaslessCommentDeletionRequestBodySchema.safeParse(await req.json());

  if (!parsedBodyResult.success) {
    return Response.json(parsedBodyResult.error.flatten(), { status: 400 });
  }

  const {
    author: authorAddress,
    commentId,
    submitIfApproved,
  } = parsedBodyResult.data;

  const account = privateKeyToAccount(
    process.env.APP_SIGNER_PRIVATE_KEY! as `0x${string}`
  );

  const nonce = await getNonce({
    author: authorAddress,
    appSigner: account.address,
    chain,
    transport,
  });

  // Construct deletion signature data
  const typedDeleteCommentData = createDeleteCommentTypedData({
    commentId: commentId as `0x${string}`,
    chainId: chain.id,
    author: authorAddress,
    appSigner: account.address,
    nonce: nonce,
  });

  const signature = await account.signTypedData(typedDeleteCommentData);

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
        ...typedDeleteCommentData,
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
            typedDeleteCommentData.message.deadline,
            "0x",
            signature,
          ],
        });
        return Response.json(
          PreparedGaslessCommentOperationApprovedSchema.parse({
            txHash,
          }) satisfies PreparedGaslessCommentOperationSchemaType
        );
      } catch (error) {
        console.error(error);
        return Response.json(
          { error: "Failed to delete comment" },
          { status: 500 }
        );
      }
    }
  }

  return Response.json(
    PreparedSignedGaslessCommentOperationNotApprovedSchema.parse({
      signTypedDataParams: JSON.parse(
        JSON.stringify(typedDeleteCommentData, bigintReplacer)
      ),
      appSignature: signature,
    }) satisfies PreparedGaslessCommentOperationSchemaType
  );
}
