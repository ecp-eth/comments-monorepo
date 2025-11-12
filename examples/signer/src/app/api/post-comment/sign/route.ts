import { hashTypedData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  createCommentData,
  createCommentTypedData,
} from "@ecp.eth/sdk/comments";
import { JSONResponse } from "@ecp.eth/shared-signer/helpers/response";
import { bigintReplacer } from "@ecp.eth/shared-signer/helpers/json";
import { SignPostCommentResponseBodySchema } from "@ecp.eth/shared-signer/schemas/signer-api/post";
import {
  type BadRequestResponseBodySchema,
  ErrorResponseBodySchema,
} from "@ecp.eth/shared-signer/schemas/signer-api/shared";
import { SignPostCommentRequestPayloadRestrictedSchema } from "@/lib/schemas/post";
import {
  guardAppSignerPrivateKey,
  guardAuthorIsNotMuted,
  guardContentLength,
  guardRateLimitNotExceeded,
  guardRequestPayloadSchemaIsValid,
  guardTargetUriMatchesRegex,
} from "@/lib/guards";
import { nonceManager } from "@/instances";

/**
 * Signs a comment to be sent by the author.
 */
export async function POST(
  req: Request,
): Promise<
  JSONResponse<
    | typeof SignPostCommentResponseBodySchema
    | typeof BadRequestResponseBodySchema
    | typeof ErrorResponseBodySchema
  >
> {
  try {
    const appSignerPrivateKey = guardAppSignerPrivateKey();
    const parsedBodyData = guardRequestPayloadSchemaIsValid(
      SignPostCommentRequestPayloadRestrictedSchema,
      await req.json(),
    );
    const { content, author, metadata, chainConfig, commentType, channelId } =
      parsedBodyData;

    guardContentLength(content);
    guardTargetUriMatchesRegex(parsedBodyData);
    await guardRateLimitNotExceeded(author);
    await guardAuthorIsNotMuted(author);

    const app = privateKeyToAccount(appSignerPrivateKey, {
      nonceManager,
    });
    const commentData = createCommentData({
      content,
      metadata,
      author,
      app: app.address,
      channelId,
      ...("parentId" in parsedBodyData
        ? {
            parentId: parsedBodyData.parentId,
          }
        : {
            targetUri: parsedBodyData.targetUri,
          }),
      commentType,
    });

    const typedCommentData = createCommentTypedData({
      commentData,
      chainId: chainConfig.chain.id,
    });

    const signature = await app.signTypedData(typedCommentData);
    const hash = hashTypedData(typedCommentData);

    return new JSONResponse(
      SignPostCommentResponseBodySchema,
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
    if (error instanceof JSONResponse) {
      return error;
    }

    console.error("Error in sign endpoint:", error);

    return new JSONResponse(
      ErrorResponseBodySchema,
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
