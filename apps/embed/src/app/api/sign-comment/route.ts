import { env } from "@/env";
import {
  SignCommentPayloadRequestSchema,
  SignCommentResponseServerSchema,
} from "@/lib/schemas";
import { bigintReplacer } from "@/lib/utils";
import { createCommentData, createCommentTypedData } from "@ecp.eth/sdk";
import { hashTypedData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { signCommentRateLimiter } from "@/services/rate-limiter";

export async function POST(req: Request) {
  const { content, targetUri, parentId, chainId, author } =
    SignCommentPayloadRequestSchema.parse(await req.json());

  // Check if the address is rate limited
  const rateLimiterResult = await signCommentRateLimiter.isRateLimited(author);

  if (!rateLimiterResult.success) {
    return new Response("Too many requests", {
      status: 429,
      headers: {
        "Retry-After": String(
          Math.ceil((rateLimiterResult.reset - Date.now()) / 1000)
        ),
      },
    });
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
