import { env } from "@/lib/env";
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
import {
  SignEditCommentRequestPayloadSchema,
  SignEditCommentResponseBodySchema,
} from "@/lib/schemas/edit";
import { guardRequestPayloadSchemaIsValid } from "@/lib/guards";
import {
  BadRequestResponseBodySchema,
  ErrorResponseBodySchema,
} from "@/lib/schemas/shared";

/**
 * Signs an edit comment to be sent by the author.
 */
export async function POST(
  req: Request,
): Promise<
  JSONResponse<
    | typeof SignEditCommentResponseBodySchema
    | typeof BadRequestResponseBodySchema
    | typeof ErrorResponseBodySchema
  >
> {
  if (!env.APP_SIGNER_PRIVATE_KEY) {
    return new JSONResponse(
      ErrorResponseBodySchema,
      { error: "Not Found" },
      { status: 404 },
    );
  }

  try {
    const { commentId, content, author, metadata, chainConfig } =
      guardRequestPayloadSchemaIsValid(
        SignEditCommentRequestPayloadSchema,
        await req.json(),
      );

    // Check if author is muted (if indexer URL is configured)
    if (env.COMMENTS_INDEXER_URL) {
      if (
        await isMuted({
          address: author,
          apiUrl: env.COMMENTS_INDEXER_URL,
        })
      ) {
        return new JSONResponse(
          ErrorResponseBodySchema,
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
      SignEditCommentResponseBodySchema,
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
    if (error instanceof JSONResponse) {
      return error;
    }

    console.error("Error in edit comment sign endpoint:", error);

    return new JSONResponse(
      ErrorResponseBodySchema,
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
