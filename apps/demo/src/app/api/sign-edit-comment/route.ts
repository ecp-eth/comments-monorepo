import { env } from "@/env";
import {
  BadRequestResponseSchema,
  SignEditCommentPayloadRequestSchema,
} from "@/lib/schemas";
import { bigintReplacer, JSONResponse } from "@ecp.eth/shared/helpers";
import {
  createEditCommentData,
  createEditCommentTypedData,
  getNonce,
} from "@ecp.eth/sdk/comments";
import { isMuted } from "@ecp.eth/sdk/indexer";
import { hashTypedData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { signCommentRateLimiter } from "@/services/rate-limiter";
import { chain, transport } from "@/lib/wagmi";
import { createPublicClient } from "viem";
import { SignEditCommentResponseClientSchema } from "@ecp.eth/shared/schemas";

const chainId = chain.id;

export async function POST(
  req: Request,
): Promise<
  JSONResponse<
    typeof SignEditCommentResponseClientSchema | typeof BadRequestResponseSchema
  >
> {
  const parsedBodyResult = SignEditCommentPayloadRequestSchema.safeParse(
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

  const { commentId, content, author, metadata } = passedCommentData;

  if (content.length > env.COMMENT_CONTENT_LENGTH_LIMIT) {
    return new JSONResponse(
      BadRequestResponseSchema,
      {
        content: ["Comment content too large"],
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
    transport,
  });
  const nonce = await getNonce({
    author,
    app: app.address,
    readContract: publicClient.readContract,
  });

  const edit = createEditCommentData({
    content,
    app: app.address,
    nonce,
    commentId,
    metadata,
  });

  const typedCommentData = createEditCommentTypedData({
    edit,
    chainId,
    author,
  });

  const signature = await app.signTypedData(typedCommentData);

  const hash = hashTypedData(typedCommentData);

  return new JSONResponse(
    SignEditCommentResponseClientSchema,
    {
      signature,
      hash,
      data: edit,
    },
    {
      jsonReplacer: bigintReplacer,
    },
  );
}
