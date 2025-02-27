import { JSONResponse } from "@/lib/json-response";
import {
  BadRequestResponseSchema,
  InternalServerErrorResponseSchema,
  PreparedGaslessCommentOperationApprovedResponseSchema,
  PreparedSignedGaslessPostCommentNotApprovedResponseSchema,
  PrepareSignedGaslessCommentRequestBodySchema,
} from "@/lib/schemas";
import { resolveSubmitterAccount } from "@/lib/submitter";
import { bigintReplacer } from "@/lib/utils";
import {
  chains as configChains,
  transports as configTransports,
} from "@/lib/wagmi";
import {
  COMMENTS_V1_ADDRESS,
  CommentsV1Abi,
  createCommentData,
  createCommentTypedData,
  getNonce,
} from "@ecp.eth/sdk";
import { createWalletClient, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export async function POST(
  req: Request
): Promise<
  JSONResponse<
    | typeof PreparedGaslessCommentOperationApprovedResponseSchema
    | typeof PreparedSignedGaslessPostCommentNotApprovedResponseSchema
    | typeof BadRequestResponseSchema
    | typeof InternalServerErrorResponseSchema
  >
> {
  const parsedBodyResult =
    PrepareSignedGaslessCommentRequestBodySchema.safeParse(await req.json());

  if (!parsedBodyResult.success) {
    return new JSONResponse(
      BadRequestResponseSchema,
      parsedBodyResult.error.flatten().fieldErrors,
      { status: 400 }
    );
  }

  const { content, targetUri, parentId, author, submitIfApproved } =
    parsedBodyResult.data;

  // Validate target URL is valid
  if (!targetUri.startsWith(process.env.APP_URL!)) {
    return new JSONResponse(
      BadRequestResponseSchema,
      { targetUri: ["Invalid target URL"] },
      { status: 400 }
    );
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

  const typedCommentData = createCommentTypedData({
    commentData,
    chainId: configChains[0].id,
  });

  const signature = await account.signTypedData(typedCommentData);

  if (submitIfApproved) {
    const submitterAccount = await resolveSubmitterAccount();
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
      args: [author, account.address],
    });

    if (isApproved) {
      // Verify app signature
      const isAppSignatureValid = await walletClient.verifyTypedData({
        ...typedCommentData,
        signature,
        address: account.address,
      });

      if (!isAppSignatureValid) {
        console.error("Invalid app signature");

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
          functionName: "postComment",
          args: [commentData, "0x", signature],
        });

        return new JSONResponse(
          PreparedGaslessCommentOperationApprovedResponseSchema,
          {
            txHash,
          }
        );
      } catch (error) {
        console.error(error);

        return new JSONResponse(
          InternalServerErrorResponseSchema,
          { error: "Failed to post comment" },
          { status: 500 }
        );
      }
    }
  }

  return new JSONResponse(
    PreparedSignedGaslessPostCommentNotApprovedResponseSchema,
    {
      signTypedDataParams: typedCommentData,
      appSignature: signature,
    },
    {
      jsonReplacer: bigintReplacer,
    }
  );
}
