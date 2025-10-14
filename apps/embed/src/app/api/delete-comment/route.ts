import { env } from "@/env";
import {
  DeleteCommentPayloadRequestSchema,
  DeleteCommentResponseSchema,
} from "@/lib/schemas";
import { privateTransport } from "@/lib/serverWagmi";
import {
  guardAPIDeadline,
  guardAuthorSignature,
  guardNoSubmitterPrivateKey,
} from "@/lib/guards";
import { supportedChains } from "@/lib/wagmi";
import {
  createDeleteCommentTypedData,
  deleteCommentWithSig,
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
    const parseResult = DeleteCommentPayloadRequestSchema.safeParse(
      await req.json(),
    );

    if (!parseResult.success) {
      return Response.json(parseResult.error.flatten().fieldErrors, {
        status: 400,
      });
    }

    const passedDeleteData = parseResult.data;
    const {
      comment: { commentId, author, chainId },
      authorSignature,
      deadline,
    } = passedDeleteData;

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
    const typedDeleteData = createDeleteCommentTypedData({
      commentId,
      author,
      app: appAccount.address,
      deadline,
      chainId,
    });

    await guardAuthorSignature({
      publicClient,
      authorSignature,
      signTypedDataParams: typedDeleteData,
      authorAddress: author,
    });

    const submitterAccount = privateKeyToAccount(submitterPrivateKey);
    const submitterWalletClient = createWalletClient({
      account: submitterAccount,
      chain: selectedChain,
      transport: privateTransport,
    });
    const hash = hashTypedData(typedDeleteData);
    const appSignature = await appAccount.signTypedData(typedDeleteData);
    const { txHash } = await deleteCommentWithSig({
      commentId,
      app: appAccount.address,
      appSignature,
      authorSignature,
      deadline: typedDeleteData.message.deadline,
      writeContract: submitterWalletClient.writeContract,
    });

    return new JSONResponse(
      DeleteCommentResponseSchema,
      {
        txHash,
        signature: appSignature,
        hash,
        data: typedDeleteData.message,
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
