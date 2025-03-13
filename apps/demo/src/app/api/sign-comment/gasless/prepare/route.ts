import { env } from "@/env";
import { JSONResponse } from "@/lib/json-response";
import {
  BadRequestResponseSchema,
  InternalServerErrorResponseSchema,
  PreparedGaslessPostCommentOperationApprovedResponseSchema,
  PreparedSignedGaslessPostCommentNotApprovedResponseSchema,
  PrepareSignedGaslessCommentRequestBodySchema,
} from "@/lib/schemas";
import { resolveSubmitterAccount } from "@/lib/submitter";
import { bigintReplacer } from "@/lib/utils";
import { chain, transport } from "@/lib/wagmi";
import {
  COMMENTS_V1_ADDRESS,
  CommentsV1Abi,
  createCommentData,
  createCommentTypedData,
  isSpammer,
} from "@ecp.eth/sdk";
import { createWalletClient, hashTypedData, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { signCommentRateLimiter } from "@/services/rate-limiter";

export async function POST(
  req: Request
): Promise<
  JSONResponse<
    | typeof PreparedGaslessPostCommentOperationApprovedResponseSchema
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
  if (!targetUri.startsWith(env.APP_URL)) {
    return new JSONResponse(
      BadRequestResponseSchema,
      { targetUri: ["Invalid target URL"] },
      { status: 400 }
    );
  }

  const rateLimitResult = await signCommentRateLimiter.isRateLimited(author);

  if (!rateLimitResult.success) {
    return new JSONResponse(
      BadRequestResponseSchema,
      { author: ["Too many requests"] },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
          ),
        },
      }
    );
  }

  if (
    await isSpammer({
      address: author,
      apiUrl: env.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
    })
  ) {
    return new JSONResponse(
      BadRequestResponseSchema,
      { author: ["Spammer"] },
      { status: 400 }
    );
  }

  const account = privateKeyToAccount(env.APP_SIGNER_PRIVATE_KEY);

  const commentData = createCommentData({
    content,
    targetUri,
    parentId,
    author,
    appSigner: account.address,
  });

  const typedCommentData = createCommentTypedData({
    commentData,
    chainId: chain.id,
  });

  const signature = await account.signTypedData(typedCommentData);
  const commentId = hashTypedData(typedCommentData);

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
          PreparedGaslessPostCommentOperationApprovedResponseSchema,
          {
            txHash,
            id: commentId,
            appSignature: signature,
            commentData,
          },
          {
            jsonReplacer: bigintReplacer,
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
      id: commentId,
      appSignature: signature,
      commentData,
    },
    {
      jsonReplacer: bigintReplacer,
    }
  );
}
