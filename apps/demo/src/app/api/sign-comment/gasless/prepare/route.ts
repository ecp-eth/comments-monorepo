import { env } from "@/env";
import {
  BadRequestResponseSchema,
  InternalServerErrorResponseSchema,
  PreparedGaslessPostCommentOperationApprovedResponseSchema,
  PreparedSignedGaslessPostCommentNotApprovedResponseSchema,
  PrepareSignedGaslessCommentRequestBodySchema,
} from "@/lib/schemas";
import { resolveSubmitterAccount } from "@/lib/submitter";
import { bigintReplacer, JSONResponse } from "@ecp.eth/shared/helpers";
import { chain, transport } from "@/lib/wagmi";
import {
  createCommentData,
  createCommentTypedData,
  isApproved,
  postCommentWithSig,
} from "@ecp.eth/sdk/comments";
import { isMuted } from "@ecp.eth/sdk/indexer";
import { createWalletClient, hashTypedData, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { signCommentRateLimiter } from "@/services/rate-limiter";

export async function POST(
  req: Request,
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
      { status: 400 },
    );
  }

  const passedCommentData = parsedBodyResult.data;
  const { author, content, submitIfApproved } = passedCommentData;

  const rateLimitResult = await signCommentRateLimiter.isRateLimited(author);

  if (!rateLimitResult.success) {
    return new JSONResponse(
      BadRequestResponseSchema,
      { author: ["Too many requests"] },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
          ),
        },
      },
    );
  }

  if (
    await isMuted({
      address: author,
      apiUrl: env.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
    })
  ) {
    return new JSONResponse(
      BadRequestResponseSchema,
      { author: ["Muted"] },
      { status: 400 },
    );
  }

  const app = privateKeyToAccount(env.APP_SIGNER_PRIVATE_KEY);

  const commentData = createCommentData({
    content,
    author,
    app: app.address,

    ...("parentId" in passedCommentData
      ? {
          parentId: passedCommentData.parentId,
        }
      : {
          targetUri: passedCommentData.targetUri,
        }),
  });

  const chainId = chain.id;

  const typedCommentData = createCommentTypedData({
    commentData,
    chainId,
  });

  const signature = await app.signTypedData(typedCommentData);
  const commentId = hashTypedData(typedCommentData);

  if (submitIfApproved) {
    const submitterAccount = await resolveSubmitterAccount();
    const walletClient = createWalletClient({
      account: submitterAccount,
      chain,
      transport,
    }).extend(publicActions);

    // Check approval on chain
    const hasApproval = await isApproved({
      app: app.address,
      author,
      readContract: walletClient.readContract,
    });

    if (hasApproval) {
      // Verify app signature
      const isAppSignatureValid = await walletClient.verifyTypedData({
        ...typedCommentData,
        signature,
        address: app.address,
      });

      if (!isAppSignatureValid) {
        console.error("Invalid app signature");

        return new JSONResponse(
          BadRequestResponseSchema,
          { appSignature: ["Invalid app signature"] },
          { status: 400 },
        );
      }

      try {
        const { txHash } = await postCommentWithSig({
          comment: typedCommentData.message,
          appSignature: signature,
          writeContract: walletClient.writeContract,
        });

        return new JSONResponse(
          PreparedGaslessPostCommentOperationApprovedResponseSchema,
          {
            txHash,
            id: commentId,
            appSignature: signature,
            commentData: { ...commentData, id: commentId },
            chainId,
          },
          {
            jsonReplacer: bigintReplacer,
          },
        );
      } catch (error) {
        console.error(error);

        return new JSONResponse(
          InternalServerErrorResponseSchema,
          { error: "Failed to post comment" },
          { status: 500 },
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
      commentData: { ...commentData, id: commentId },
      chainId,
    },
    {
      jsonReplacer: bigintReplacer,
    },
  );
}
