import { env } from "@/lib/env";
import {
  BadRequestResponseSchema,
  ErrorResponseSchema,
  SignEditCommentPayloadRequestSchema,
  SignEditCommentResponseServerSchema,
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
import { createPublicClient, http } from "viem";
import { getRpcUrl } from "@/lib/env";

/**
 * Signs an edit comment to be sent by the author.
 */
export async function POST(
  req: Request,
): Promise<
  JSONResponse<
    | typeof SignEditCommentResponseServerSchema
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
    const { commentId, content, author, metadata, chainConfig } =
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
    const publicClient = createPublicClient({
      chain: chainConfig.chain,
      transport: http(getRpcUrl(chainConfig.chain.id)),
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

    const typedCommentData = createEditCommentTypedData({
      edit,
      chainId: chainConfig.chain.id,
      author,
    });

    const signature = await app.signTypedData(typedCommentData);
    const hash = hashTypedData(typedCommentData);

    return new JSONResponse(
      SignEditCommentResponseServerSchema,
      {
        signature,
        hash,
        data: edit,
      },
      {
        jsonReplacer: bigintReplacer,
      },
    );
  } catch (error) {
    console.error("Error in edit comment sign endpoint:", error);

    return new JSONResponse(
      ErrorResponseSchema,
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
