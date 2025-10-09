import { env } from "@/env";
import {
  EditCommentPayloadRequestSchema,
  EditCommentResponseSchema,
} from "@/lib/schemas";
import { privateTransport } from "@/lib/serverWagmi";
import {
  guardAPIDeadline,
  guardNoSubmitterPrivateKey,
  guardAuthorSignature,
} from "@/lib/guards";
import { supportedChains } from "@/lib/wagmi";
import {
  createEditCommentData,
  createEditCommentTypedData,
  editCommentWithSig,
  getNonce,
  isApproved,
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
    const parseResult = EditCommentPayloadRequestSchema.safeParse(
      await req.json(),
    );

    if (!parseResult.success) {
      return Response.json(parseResult.error.flatten().fieldErrors, {
        status: 400,
      });
    }

    const passedCommentData = parseResult.data;
    const {
      comment: { commentId, content, author, chainId, metadata },
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
            "Author has not approved submitter address for edit, provide author signature to edit the comment",
        },
        { status: 400 },
      );
    }

    const nonce = await getNonce({
      author,
      app: appAccount.address,
      readContract: publicClient.readContract,
    });

    const editCommentData = createEditCommentData({
      commentId,
      content,
      app: appAccount.address,
      nonce,
      deadline,
      metadata,
    });

    const typedEditCommentData = createEditCommentTypedData({
      author,
      edit: editCommentData,
      chainId,
    });

    if (authorSignature) {
      await guardAuthorSignature({
        publicClient,
        authorSignature,
        signTypedDataParams: typedEditCommentData,
        authorAddress: author,
      });
    }

    const hash = hashTypedData(typedEditCommentData);

    const submitterAccount = privateKeyToAccount(submitterPrivateKey);
    const submitterWalletClient = createWalletClient({
      account: submitterAccount,
      chain: selectedChain,
      transport: privateTransport,
    });

    const appSignature = await appAccount.signTypedData(typedEditCommentData);

    const { txHash } = await editCommentWithSig({
      appSignature,
      authorSignature,
      edit: typedEditCommentData.message,
      writeContract: submitterWalletClient.writeContract,
    });

    return new JSONResponse(
      EditCommentResponseSchema,
      {
        txHash,
        signature: appSignature,
        hash,
        data: editCommentData,
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
