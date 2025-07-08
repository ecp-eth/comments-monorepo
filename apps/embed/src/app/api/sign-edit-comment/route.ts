import { env } from "@/env";
import { SignEditCommentPayloadRequestSchema } from "@/lib/schemas";
import {
  bigintReplacer,
  getChainById,
  JSONResponse,
} from "@ecp.eth/shared/helpers";
import {
  createEditCommentData,
  createEditCommentTypedData,
  getNonce,
} from "@ecp.eth/sdk/comments";
import { isMuted } from "@ecp.eth/sdk/indexer";
import { hashTypedData, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { signCommentRateLimiter } from "@/services/rate-limiter";
import { supportedChains } from "@/lib/wagmi";
import { createPublicClient } from "viem";
import { SignEditCommentResponseClientSchema } from "@ecp.eth/shared/schemas";

export async function POST(req: Request) {
  const parsedBodyResult = SignEditCommentPayloadRequestSchema.safeParse(
    await req.json(),
  );

  if (!parsedBodyResult.success) {
    return Response.json(parsedBodyResult.error.flatten().fieldErrors, {
      status: 400,
    });
  }

  const passedCommentData = parsedBodyResult.data;
  const { commentId, content, author, metadata, chainId } = passedCommentData;

  if (content.length > env.COMMENT_CONTENT_LENGTH_LIMIT) {
    return Response.json(
      {
        error: `Comment content length limit exceeded (max ${env.COMMENT_CONTENT_LENGTH_LIMIT} characters)`,
      },
      { status: 413 },
    );
  }

  const rateLimitResult = await signCommentRateLimiter.isRateLimited(author);

  if (!rateLimitResult.success) {
    return Response.json(
      {
        error: "Too many requests",
      },
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
    return Response.json(
      {
        error: "Muted",
      },
      { status: 400 },
    );
  }

  const selectedChain = getChainById(chainId, supportedChains);

  if (!selectedChain) {
    return Response.json(
      {
        error: "Chain not supported",
      },
      { status: 400 },
    );
  }

  const app = privateKeyToAccount(env.APP_SIGNER_PRIVATE_KEY);
  const publicClient = createPublicClient({
    chain: selectedChain,
    transport: http(),
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
    metadata: metadata,
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
