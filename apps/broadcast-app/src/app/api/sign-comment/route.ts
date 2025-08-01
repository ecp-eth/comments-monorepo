import { serverEnv } from "@/env/server";
import { Errors, createClient } from "@farcaster/quick-auth";
import {
  BadRequestResponseSchema,
  SignCommentPayloadRequestServerSchema,
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
import { SUPPORTED_CHAINS } from "@ecp.eth/sdk";

const quickAuthClient = createClient();

const chainId = chain.id;

export async function POST(
  req: Request,
): Promise<
  JSONResponse<
    typeof SignCommentResponseServerSchema | typeof BadRequestResponseSchema
  >
> {
  try {
    const authorization = req.headers.get("authorization");
    const [, token] = authorization?.split(" ") || [];

    if (!token) {
      return new JSONResponse(
        BadRequestResponseSchema,
        {
          authorization: ["Missing token"],
        },
        { status: 401 },
      );
    }

    await quickAuthClient.verifyJwt({
      token,
      domain: new URL(serverEnv.FARCASTER_MINI_APP_URL).hostname,
    });
  } catch (e) {
    console.error(e);
    if (e instanceof Errors.InvalidTokenError) {
      console.info("Invalid token:", e.message);

      return new JSONResponse(
        BadRequestResponseSchema,
        {
          authorization: ["Invalid token"],
        },
        { status: 401 },
      );
    }

    throw e;
  }

  const parsedBodyResult = SignCommentPayloadRequestServerSchema.safeParse(
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

  const { content, author, metadata, commentType, channelId } =
    passedCommentData;

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
    channelId,
    ...("parentId" in passedCommentData
      ? {
          parentId: passedCommentData.parentId,
        }
      : {
          targetUri: passedCommentData.targetUri,
        }),
  });

  const typedCommentData = createCommentTypedData({
    commentsAddress: SUPPORTED_CHAINS[chainId].commentManagerAddress,
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
