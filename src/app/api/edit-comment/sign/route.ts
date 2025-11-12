import {
  createEditCommentData,
  createEditCommentTypedData,
  getNonce,
} from "@ecp.eth/sdk/comments";
import { JSONResponse } from "@ecp.eth/shared-signer/helpers/response";
import { bigintReplacer } from "@ecp.eth/shared-signer/helpers/json";
import {
  type BadRequestResponseBodySchema,
  ErrorResponseBodySchema,
} from "@ecp.eth/shared-signer/schemas/signer-api/shared";
import { SignEditCommentResponseBodySchema } from "@ecp.eth/shared-signer/schemas/signer-api/edit";
import { env } from "@/lib/env";
import { hashTypedData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http } from "viem";
import { getRpcUrl } from "@/lib/env";
import { SignEditCommentRequestPayloadRestrictedSchema } from "@/lib/schemas/edit";
import {
  guardAuthorIsNotMuted,
  guardContentLength,
  guardRateLimitNotExceeded,
  guardRequestPayloadSchemaIsValid,
} from "@/lib/guards";
import { nonceManager } from "@/instances";

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
        SignEditCommentRequestPayloadRestrictedSchema,
        await req.json(),
      );

    guardContentLength(content);
    await guardRateLimitNotExceeded(author);
    await guardAuthorIsNotMuted(author);

    const app = privateKeyToAccount(env.APP_SIGNER_PRIVATE_KEY, {
      nonceManager,
    });
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
