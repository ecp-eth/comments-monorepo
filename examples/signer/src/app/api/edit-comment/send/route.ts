import { getRpcUrl } from "@/lib/env";
import {
  guardAPIDeadline,
  guardAuthorIsNotMuted,
  guardAuthorSignature,
  guardContentLength,
  guardRateLimitNotExceeded,
  guardRequestPayloadSchemaIsValid,
} from "@/lib/guards";
import {
  createEditCommentData,
  createEditCommentTypedData,
  editCommentWithSig,
  getNonce,
} from "@ecp.eth/sdk/comments";
import { bigintReplacer, JSONResponse } from "@ecp.eth/shared/helpers";
import {
  type BadRequestResponseBodySchema,
  ErrorResponseBodySchema,
} from "@ecp.eth/shared/schemas/signer-api/shared";
import { SendEditCommentResponseBodySchema } from "@ecp.eth/shared/schemas/signer-api/edit";
import {
  createPublicClient,
  createWalletClient,
  hashTypedData,
  http,
} from "viem";
import { getGaslessSigner, getGaslessSubmitter } from "@/lib/helpers";
import { SendEditCommentRequestPayloadRestrictedSchema } from "@/lib/schemas/edit";

export async function POST(
  req: Request,
): Promise<
  JSONResponse<
    | typeof SendEditCommentResponseBodySchema
    | typeof BadRequestResponseBodySchema
    | typeof ErrorResponseBodySchema
  >
> {
  try {
    const {
      commentId,
      content,
      author,
      chainId,
      metadata,
      authorSignature,
      deadline,
      chainConfig,
    } = guardRequestPayloadSchemaIsValid(
      SendEditCommentRequestPayloadRestrictedSchema,
      await req.json(),
    );

    guardContentLength(content);
    guardAPIDeadline(deadline);
    await guardRateLimitNotExceeded(author);
    await guardAuthorIsNotMuted(author);

    const selectedChain = chainConfig.chain;
    const publicClient = createPublicClient({
      chain: selectedChain,
      transport: http(getRpcUrl(chainConfig.chain.id)),
    });
    const appAccount = await getGaslessSigner();
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

    await guardAuthorSignature({
      publicClient,
      authorSignature,
      signTypedDataParams: typedEditCommentData,
      authorAddress: author,
    });

    const hash = hashTypedData(typedEditCommentData);
    const submitterAccount = await getGaslessSubmitter();
    const submitterWalletClient = createWalletClient({
      account: submitterAccount,
      chain: selectedChain,
      transport: http(getRpcUrl(chainConfig.chain.id)),
    });
    const appSignature = await appAccount.signTypedData(typedEditCommentData);
    const { txHash } = await editCommentWithSig({
      appSignature,
      authorSignature,
      edit: typedEditCommentData.message,
      writeContract: submitterWalletClient.writeContract,
    });

    return new JSONResponse(
      SendEditCommentResponseBodySchema,
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
    if (error instanceof JSONResponse) {
      return error;
    }

    console.error("Error in edit comment submit endpoint:", error);

    return new JSONResponse(
      ErrorResponseBodySchema,
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
