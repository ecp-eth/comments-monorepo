import { env } from "@/env";
import {
  SignCommentPayloadRequestSchema,
  SignCommentResponseServerSchema,
} from "@/lib/schemas";
import {
  bigintReplacer,
  getChainById,
  JSONResponse,
} from "@ecp.eth/shared/helpers";
import {
  createCommentData,
  createCommentTypedData,
  getNonce,
} from "@ecp.eth/sdk/comments";
import { isMuted } from "@ecp.eth/sdk/indexer";
import { createPublicClient, hashTypedData, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { signCommentRateLimiter } from "@/services/rate-limiter";
import { supportedChains } from "@/lib/wagmi";

export async function POST(req: Request) {
  const parseResult = SignCommentPayloadRequestSchema.safeParse(
    await req.json()
  );

  if (!parseResult.success) {
    return Response.json(parseResult.error.flatten().fieldErrors, {
      status: 400,
    });
  }

  const passedCommentData = parseResult.data;
  const { content, author, chainId } = passedCommentData;

  const rateLimiterResult = await signCommentRateLimiter.isRateLimited(author);

  if (!rateLimiterResult.success) {
    return Response.json(
      {
        error: "Too many requests",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil((rateLimiterResult.reset - Date.now()) / 1000)
          ),
        },
      }
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
      {
        status: 403,
      }
    );
  }

  const selectedChain = getChainById(chainId, supportedChains);

  if (!selectedChain) {
    return Response.json(
      {
        error: "Chain not supported",
      },
      { status: 400 }
    );
  }

  const account = privateKeyToAccount(env.APP_SIGNER_PRIVATE_KEY);
  const publicClient = createPublicClient({
    chain: selectedChain,
    transport: http(),
  });

  const nonce = await getNonce({
    author,
    appSigner: account.address,
    readContract: publicClient.readContract,
  });

  const commentData = createCommentData({
    content,
    author,
    appSigner: account.address,
    nonce,
    ...("parentId" in passedCommentData
      ? {
          parentId: passedCommentData.parentId,
        }
      : {
          targetUri: passedCommentData.targetUri,
        }),
  });

  const typedCommentData = createCommentTypedData({
    commentData,
    chainId,
  });

  const signature = await account.signTypedData(typedCommentData);

  const hash = hashTypedData(typedCommentData);

  return new JSONResponse(
    SignCommentResponseServerSchema,
    {
      signature,
      hash,
      data: { ...commentData, id: hash },
    },
    {
      jsonReplacer: bigintReplacer,
    }
  );
}
