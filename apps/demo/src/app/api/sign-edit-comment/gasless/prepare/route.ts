import { env } from "@/env";
import {
  BadRequestResponseSchema,
  InternalServerErrorResponseSchema,
  PrepareSignedGaslessEditCommentApprovedResponseSchema,
  PrepareSignedGaslessEditCommentNotApprovedResponseSchema,
  PrepareSignedGaslessEditCommentRequestBodySchema,
} from "@/lib/schemas";
import { resolveSubmitterAccount } from "@/lib/submitter";
import { bigintReplacer, JSONResponse } from "@ecp.eth/shared/helpers";
import { chain, privateTransport } from "@/lib/serverWagmi";
import {
  createEditCommentData,
  createEditCommentTypedData,
  getNonce,
  isApproved,
  editCommentWithSig,
} from "@ecp.eth/sdk/comments";
import { isMuted } from "@ecp.eth/sdk/indexer";
import { createPublicClient, createWalletClient, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { signCommentRateLimiter } from "@/services/rate-limiter";

export async function POST(
  req: Request,
): Promise<
  JSONResponse<
    | typeof PrepareSignedGaslessEditCommentApprovedResponseSchema
    | typeof PrepareSignedGaslessEditCommentNotApprovedResponseSchema
    | typeof BadRequestResponseSchema
    | typeof InternalServerErrorResponseSchema
  >
> {
  const parsedBodyResult =
    PrepareSignedGaslessEditCommentRequestBodySchema.safeParse(
      await req.json(),
    );

  if (!parsedBodyResult.success) {
    return new JSONResponse(
      BadRequestResponseSchema,
      parsedBodyResult.error.flatten().fieldErrors,
      { status: 400 },
    );
  }

  const passedCommentData = parsedBodyResult.data;
  const { author, commentId, content, metadata, submitIfApproved } =
    passedCommentData;

  if (content.length > env.COMMENT_CONTENT_LENGTH_LIMIT) {
    return new JSONResponse(
      BadRequestResponseSchema,
      {
        content: [
          `Comment content length limit exceeded (max ${env.COMMENT_CONTENT_LENGTH_LIMIT} characters)`,
        ],
      },
      { status: 413 },
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
  const publicClient = createPublicClient({
    chain,
    transport: privateTransport,
  });

  const nonce = await getNonce({
    author,
    app: app.address,
    readContract: publicClient.readContract,
  });

  const edit = createEditCommentData({
    commentId,
    content,
    app: app.address,
    nonce,
    metadata,
  });

  const chainId = chain.id;

  const typedCommentData = createEditCommentTypedData({
    author,
    edit,
    chainId,
  });

  const signature = await app.signTypedData(typedCommentData);

  if (submitIfApproved) {
    const submitterAccount = await resolveSubmitterAccount();
    const walletClient = createWalletClient({
      account: submitterAccount,
      chain,
      transport: privateTransport,
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
        const { txHash } = await editCommentWithSig({
          edit: typedCommentData.message,
          appSignature: signature,
          writeContract: walletClient.writeContract,
        });

        return new JSONResponse(
          PrepareSignedGaslessEditCommentApprovedResponseSchema,
          {
            txHash,
            appSignature: signature,
            chainId,
            edit,
          },
          {
            jsonReplacer: bigintReplacer,
          },
        );
      } catch (error) {
        console.error(error);

        return new JSONResponse(
          InternalServerErrorResponseSchema,
          { error: "Failed to edit comment" },
          { status: 500 },
        );
      }
    }
  }

  return new JSONResponse(
    PrepareSignedGaslessEditCommentNotApprovedResponseSchema,
    {
      signTypedDataParams: typedCommentData,
      appSignature: signature,
      chainId,
      edit,
    },
    {
      jsonReplacer: bigintReplacer,
    },
  );
}
