import { env } from "@/env";
import {
  SignCommentPayloadRequestSchema,
  SignCommentResponseServerSchema,
} from "@/lib/schemas";
import { bigintReplacer } from "@/lib/utils";
import {
  createCommentData,
  createCommentTypedData,
  isSpammer,
} from "@ecp.eth/sdk";
import { hashTypedData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { signCommentRateLimiter } from "@/services/rate-limiter";

export async function POST(req: Request) {
  const parseResult = SignCommentPayloadRequestSchema.safeParse(
    await req.json()
  );

  if (!parseResult.success) {
    return Response.json(parseResult.error.flatten().fieldErrors, {
      status: 400,
    });
  }

  const { content, targetUri, parentId, chainId, author } = parseResult.data;

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
    await isSpammer({
      address: author,
      apiUrl: env.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
    })
  ) {
    return Response.json(
      {
        error: "Spammer",
      },
      {
        status: 403,
      }
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
    chainId,
  });

  const signature = await account.signTypedData(typedCommentData);

  const hash = hashTypedData(typedCommentData);

  return Response.json(
    SignCommentResponseServerSchema.parse({
      signature,
      hash,
      data: {
        id: hash,
        ...JSON.parse(JSON.stringify(commentData, bigintReplacer)),
      },
    })
  );
}
