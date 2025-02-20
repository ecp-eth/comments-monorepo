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
