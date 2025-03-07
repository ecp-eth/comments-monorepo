import { env } from "@/env";
import { JSONResponse } from "@/lib/json-response";
import {
  BadRequestResponseSchema,
  SignCommentRequestBodySchema,
  SignCommentResponseSchema,
} from "@/lib/schemas";
import { bigintReplacer } from "@/lib/utils";
import { createCommentData, createCommentTypedData } from "@ecp.eth/sdk";
import { hashTypedData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { signCommentRateLimiter } from "@/services/rate-limiter";

export async function POST(
  req: Request
): Promise<
  JSONResponse<
    typeof SignCommentResponseSchema | typeof BadRequestResponseSchema
  >
> {
  const parsedBodyResult = SignCommentRequestBodySchema.safeParse(
    await req.json()
  );

  if (!parsedBodyResult.success) {
    return new JSONResponse(
      BadRequestResponseSchema,
      parsedBodyResult.error.flatten().fieldErrors,
      { status: 400 }
    );
  }

  const { content, targetUri, parentId, chainId, author } =
    parsedBodyResult.data;

  // Validate target URL is valid
  if (!targetUri.startsWith(env.APP_URL!)) {
    return new JSONResponse(
      BadRequestResponseSchema,
      { targetUri: ["Invalid target URL"] },
      { status: 400 }
    );
  }

  // Apply rate limiter
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

  const account = privateKeyToAccount(
    env.APP_SIGNER_PRIVATE_KEY
  );

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

  return new JSONResponse(
    SignCommentResponseSchema,
    {
      signature,
      hash,
      data: commentData,
    },
    {
      jsonReplacer: bigintReplacer,
    }
  );
}
