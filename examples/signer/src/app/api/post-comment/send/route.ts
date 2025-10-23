import {
  guardAPIDeadline,
  guardAppSignerPrivateKey,
  guardAuthorSignature,
  guardRequestPayloadSchemaIsValid,
} from "@/lib/guards";
import {
  createCommentData,
  createCommentTypedData,
  postCommentWithSig,
} from "@ecp.eth/sdk/comments";
import { bigintReplacer, JSONResponse } from "@ecp.eth/shared/helpers";
import {
  createPublicClient,
  createWalletClient,
  hashTypedData,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  SendPostCommentRequestPayloadSchema,
  SendPostCommentResponseBodySchema,
} from "@/lib/schemas/post";
import {
  BadRequestResponseBodySchema,
  ErrorResponseBodySchema,
} from "@/lib/schemas/shared";
import { getRpcUrl } from "@/lib/env";
import { getGaslessSubmitter } from "@/lib/helpers";

export async function POST(
  req: Request,
): Promise<
  JSONResponse<
    | typeof SendPostCommentResponseBodySchema
    | typeof BadRequestResponseBodySchema
    | typeof ErrorResponseBodySchema
  >
> {
  try {
    const appSignerPrivateKey = guardAppSignerPrivateKey();
    const parsedBodyData = guardRequestPayloadSchemaIsValid(
      SendPostCommentRequestPayloadSchema,
      await req.json(),
    );

    const {
      content,
      author,
      chainId,
      commentType,
      channelId,
      chainConfig,
      authorSignature,
      deadline,
    } = parsedBodyData;

    guardAPIDeadline(deadline);

    const selectedChain = chainConfig.chain;
    const publicClient = createPublicClient({
      chain: selectedChain,
      transport: http(getRpcUrl(chainConfig.chain.id)),
    });
    const appAccount = privateKeyToAccount(appSignerPrivateKey);
    const commentData = createCommentData({
      content,
      author,
      app: appAccount.address,
      channelId,
      commentType,
      deadline,

      ...("parentId" in parsedBodyData
        ? {
            parentId: parsedBodyData.parentId,
          }
        : {
            targetUri: parsedBodyData.targetUri,
          }),
    });

    const typedCommentData = createCommentTypedData({
      commentData,
      chainId,
    });

    await guardAuthorSignature({
      publicClient,
      authorSignature,
      signTypedDataParams: typedCommentData,
      authorAddress: author,
    });

    const submitterAccount = await getGaslessSubmitter();
    const submitterWalletClient = createWalletClient({
      account: submitterAccount,
      chain: selectedChain,
      transport: http(getRpcUrl(chainConfig.chain.id)),
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
      SendPostCommentResponseBodySchema,
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
    if (error instanceof JSONResponse) {
      return error;
    }

    console.error("Error in submit endpoint:", error);

    return new JSONResponse(
      ErrorResponseBodySchema,
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
