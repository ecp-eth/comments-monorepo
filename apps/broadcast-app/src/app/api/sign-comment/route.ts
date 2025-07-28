import { serverEnv } from "@/env/server";
import {
  BadRequestResponseSchema,
  SignCommentPayloadRequestSchema,
  SignCommentResponseServerSchema,
} from "@/api/schemas";
import { bigintReplacer, JSONResponse } from "@ecp.eth/shared/helpers";
import {
  createCommentData,
  createCommentTypedData,
} from "@ecp.eth/sdk/comments";
import { isMuted } from "@ecp.eth/sdk/indexer";
import { hashTypedData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { chain } from "@/wagmi/config";
import { publicEnv } from "@/env/public";

const chainId = chain.id;

export async function POST(
  req: Request,
): Promise<
  JSONResponse<
    typeof SignCommentResponseServerSchema | typeof BadRequestResponseSchema
  >
> {
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

  const { content, author, metadata, commentType } = passedCommentData;

  if (content.length > serverEnv.COMMENT_CONTENT_LENGTH_LIMIT) {
    return new JSONResponse(
      BadRequestResponseSchema,
      {
        content: [
          `Comment content length limit exceeded (max ${serverEnv.COMMENT_CONTENT_LENGTH_LIMIT} characters)`,
        ],
      },
      { status: 413 },
    );
  }

  if (
    await isMuted({
      address: author,
      apiUrl: publicEnv.NEXT_PUBLIC_INDEXER_URL,
    })
  ) {
    return new JSONResponse(
      BadRequestResponseSchema,
      { author: ["Muted"] },
      { status: 400 },
    );
  }

  const app = privateKeyToAccount(serverEnv.APP_SIGNER_PRIVATE_KEY);
  const commentData = createCommentData({
    content,
    metadata,
    author,
    app: app.address,
    commentType,

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
}
