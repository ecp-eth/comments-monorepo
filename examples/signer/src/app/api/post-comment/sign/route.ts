import { env } from "@/lib/env";
import {
  BadRequestResponseSchema,
  ErrorResponseSchema,
  SignCommentPayloadRequestSchema,
  SignCommentResponseServerSchema,
} from "@/lib/schemas";
import { bigintReplacer, JSONResponse } from "@ecp.eth/shared/helpers";
import {
  createCommentData,
  createCommentTypedData,
} from "@ecp.eth/sdk/comments";
import { isMuted } from "@ecp.eth/sdk/indexer";
import { hashTypedData } from "viem";
import { privateKeyToAccount } from "viem/accounts";

/**
 * Signs a comment to be sent by the author.
 */
export async function POST(
  req: Request,
): Promise<
  JSONResponse<
    | typeof SignCommentResponseServerSchema
    | typeof BadRequestResponseSchema
    | typeof ErrorResponseSchema
  >
> {
  if (!env.APP_SIGNER_PRIVATE_KEY) {
    return new JSONResponse(
      ErrorResponseSchema,
      { error: "Not Found" },
      { status: 404 },
    );
  }

  try {
    const parsedBodyResult = SignCommentPayloadRequestSchema.safeParse(
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
    const { content, author, metadata, chainConfig, commentType, channelId } =
      passedCommentData;

    // Check if author is muted (if indexer URL is configured)
    if (env.COMMENTS_INDEXER_URL) {
      if (
        await isMuted({
          address: author,
          apiUrl: env.COMMENTS_INDEXER_URL,
        })
      ) {
        return new JSONResponse(
          ErrorResponseSchema,
          { error: "Author is muted" },
          { status: 403 },
        );
      }
    }

    const app = privateKeyToAccount(env.APP_SIGNER_PRIVATE_KEY);
    const commentData = createCommentData({
      content,
      metadata,
      author,
      app: app.address,
      ...("parentId" in passedCommentData
        ? {
            parentId: passedCommentData.parentId,
          }
        : {
            targetUri: passedCommentData.targetUri,
          }),
      commentType,
      ...(channelId !== undefined ? { channelId } : {}),
    });

    const typedCommentData = createCommentTypedData({
      commentData,
      chainId: chainConfig.chain.id,
    });

    const signature = await app.signTypedData(typedCommentData);
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
      },
    );
  } catch (error) {
    console.error("Error in sign endpoint:", error);

    return new JSONResponse(
      ErrorResponseSchema,
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
