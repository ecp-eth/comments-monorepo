import { env } from "@/env";
import {
  PostCommentPayloadRequestSchema,
  PostCommentResponseSchema,
} from "@/lib/schemas";
import { supportedChains } from "@/lib/wagmi";
import {
  createCommentData,
  createCommentTypedData,
  isApproved,
  postCommentWithSig,
} from "@ecp.eth/sdk/comments";
import {
  bigintReplacer,
  getChainById,
  JSONResponse,
} from "@ecp.eth/shared/helpers";
import {
  createPublicClient,
  createWalletClient,
  hashTypedData,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

export async function POST(req: Request) {
  const parseResult = PostCommentPayloadRequestSchema.safeParse(
    await req.json(),
  );

  if (!parseResult.success) {
    return Response.json(parseResult.error.flatten().fieldErrors, {
      status: 400,
    });
  }

  const passedCommentData = parseResult.data;
  const {
    comment: { content, author, chainId, commentType },
    authorSignature,
    deadline,
  } = passedCommentData;

  if (deadline) {
    if (deadline < BigInt(Date.now())) {
      return Response.json(
        { error: "Deadline is in the past" },
        { status: 400 },
      );
    }

    if (deadline > BigInt(Date.now() + 24 * 60 * 60 * 1000)) {
      return Response.json(
        {
          error:
            "Deadline is too far in the future, please provide a deadline within 24 hours",
        },
        { status: 400 },
      );
    }
  }

  if (!env.SUBMITTER_PRIVATE_KEY) {
    return Response.json(
      { error: "Submitter private key is not set" },
      { status: 500 },
    );
  }

  const selectedChain = getChainById(chainId, supportedChains);

  if (!selectedChain) {
    return Response.json(
      {
        error: "Chain not supported",
      },
      { status: 400 },
    );
  }

  const publicClient = createPublicClient({
    chain: selectedChain,
    transport: http(),
  });
  const appAccount = privateKeyToAccount(env.APP_SIGNER_PRIVATE_KEY);

  const hasApproved = await isApproved({
    author,
    app: appAccount.address,
    readContract: publicClient.readContract,
  });

  if (!hasApproved && !authorSignature) {
    return Response.json(
      {
        error:
          "Author has not approved submitter address for post, provide author signature to post the comment",
      },
      { status: 400 },
    );
  }

  const commentData = createCommentData({
    content,
    author,
    app: appAccount.address,
    commentType,
    deadline,

    ...("parentId" in passedCommentData.comment
      ? {
          parentId: passedCommentData.comment.parentId,
        }
      : {
          targetUri: passedCommentData.comment.targetUri,
        }),
  });

  const typedCommentData = createCommentTypedData({
    commentData,
    chainId,
  });

  const hash = hashTypedData(typedCommentData);

  const submitterAccount = privateKeyToAccount(env.SUBMITTER_PRIVATE_KEY);
  const submitterWalletClient = createWalletClient({
    account: submitterAccount,
    chain: selectedChain,
    transport: http(),
  });

  const appSignature = await appAccount.signTypedData(typedCommentData);

  const { txHash } = await postCommentWithSig({
    appSignature,
    authorSignature,
    comment: typedCommentData.message,
    writeContract: submitterWalletClient.writeContract,
  });

  return new JSONResponse(
    PostCommentResponseSchema,
    {
      txHash,
      signature: appSignature,
      hash,
      data: { ...commentData, id: hash },
    },
    {
      jsonReplacer: bigintReplacer,
    },
  );
}
