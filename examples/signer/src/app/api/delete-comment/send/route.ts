import { getRpcUrl } from "@/lib/env";
import {
  guardAPIDeadline,
  guardAuthorSignature,
  guardRequestPayloadSchemaIsValid,
} from "@/lib/guards";
import { getGaslessSigner, getGaslessSubmitter } from "@/lib/helpers";
import {
  SendDeleteCommentRequestPayloadSchema,
  SendDeleteCommentResponseBodySchema,
} from "@/lib/schemas/delete";
import {
  createDeleteCommentTypedData,
  deleteCommentWithSig,
} from "@ecp.eth/sdk/comments";
import { bigintReplacer, JSONResponse } from "@ecp.eth/shared/helpers";
import {
  createPublicClient,
  createWalletClient,
  hashTypedData,
  http,
} from "viem";

export async function POST(req: Request) {
  try {
    const {
      commentId,
      author,
      chainId,
      chainConfig,
      authorSignature,
      deadline,
    } = guardRequestPayloadSchemaIsValid(
      SendDeleteCommentRequestPayloadSchema,
      await req.json(),
    );

    guardAPIDeadline(deadline);

    const publicClient = createPublicClient({
      chain: chainConfig.chain,
      transport: http(getRpcUrl(chainConfig.chain.id)),
    });
    const appAccount = await getGaslessSigner();
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

    const submitterAccount = await getGaslessSubmitter();
    const submitterWalletClient = createWalletClient({
      account: submitterAccount,
      chain: chainConfig.chain,
      transport: http(getRpcUrl(chainConfig.chain.id)),
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
      SendDeleteCommentResponseBodySchema,
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
    if (error instanceof JSONResponse) {
      return error;
    }

    console.error("Error in delete comment submit endpoint:", error);

    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
