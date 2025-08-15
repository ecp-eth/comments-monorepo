import { serverEnv } from "@/env/server";
import {
  BadRequestResponseSchema,
  SignEditCommentPayloadRequestClientSchema,
  SignEditCommentResponseServerSchema,
} from "@/api/schemas";
import { bigintReplacer, JSONResponse } from "@ecp.eth/shared/helpers";
import {
  createEditCommentData,
  createEditCommentTypedData,
  getNonce,
} from "@ecp.eth/sdk/comments";
import { isMuted } from "@ecp.eth/sdk/indexer";
import { hashTypedData, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { chain, COMMENT_MANAGER_ADDRESS } from "@/wagmi/config";
import { createPublicClient } from "viem";
import { publicEnv } from "@/env/public";

export async function POST(
  req: Request,
): Promise<
  JSONResponse<
    typeof SignEditCommentResponseServerSchema | typeof BadRequestResponseSchema
  >
> {
  const parsedBodyResult = SignEditCommentPayloadRequestClientSchema.safeParse(
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

  const { commentId, content, author, metadata } = passedCommentData;

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
  const publicClient = createPublicClient({
    chain,
    transport: http(serverEnv.PRIVATE_RPC_URL),
  });
  const nonce = await getNonce({
    commentsAddress: COMMENT_MANAGER_ADDRESS,
    author,
    app: app.address,
    readContract: publicClient.readContract,
  });

  const edit = createEditCommentData({
    content,
    app: app.address,
    nonce,
    commentId,
    metadata,
  });

  const typedCommentData = createEditCommentTypedData({
    commentsAddress: COMMENT_MANAGER_ADDRESS,
    edit,
    chainId: chain.id,
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
}
