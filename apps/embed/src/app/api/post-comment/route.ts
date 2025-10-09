import { env } from "@/env";
import {
  PostCommentPayloadRequestSchema,
  PostCommentResponseSchema,
} from "@/lib/schemas";
import { privateTransport } from "@/lib/serverWagmi";
import {
  guardAPIDeadline,
  guardAuthorSignature,
  guardNoSubmitterPrivateKey,
} from "@/lib/guards";
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
import { createPublicClient, createWalletClient, hashTypedData } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export async function POST(req: Request) {
  try {
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

    guardAPIDeadline(deadline);
    const submitterPrivateKey = guardNoSubmitterPrivateKey();

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
      transport: privateTransport,
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

    guardAuthorSignature({
      publicClient,
      authorSignature,
      signTypedDataParams: typedCommentData,
      authorAddress: author,
    });

    const submitterAccount = privateKeyToAccount(submitterPrivateKey);
    const submitterWalletClient = createWalletClient({
      account: submitterAccount,
      chain: selectedChain,
      transport: privateTransport,
    });

    const hash = hashTypedData(typedCommentData);
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
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error(error);

    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
