import { env } from "@/lib/env";
import {
  GaslessNotAvailableError,
  getGaslessSigner,
  getGaslessSubmitter,
} from "@/lib/helpers";
import {
  BadRequestResponseSchema,
  ErrorResponseSchema,
  PreparedSignedGaslessPostCommentNotApprovedResponseSchema,
  PreparedGaslessPostCommentOperationApprovedResponseSchema,
  PrepareSignedGaslessCommentRequestBodySchema,
} from "@/lib/schemas";
import { SUPPORTED_CHAINS } from "@ecp.eth/sdk";
import {
  createCommentData,
  createCommentTypedData,
  isApproved,
  postCommentWithSig,
} from "@ecp.eth/sdk/comments";
import { isMuted } from "@ecp.eth/sdk/indexer";
import { bigintReplacer, JSONResponse } from "@ecp.eth/shared/helpers";
import { createWalletClient, hashTypedData, http, publicActions } from "viem";
import { getRpcUrl } from "@/lib/env";

/**
 * Prepares a gasless comment for sending by the `send` endpoint (/api/gasless/send).
 * If submitIfApproved is true and the user has approved the app, the comment will be submitted immediately.
 */
export async function POST(
  req: Request,
): Promise<
  JSONResponse<
    | typeof PrepareSignedGaslessCommentRequestBodySchema
    | typeof BadRequestResponseSchema
    | typeof ErrorResponseSchema
  >
> {
  try {
    const signer = await getGaslessSigner();
    const parsedBodyResult =
      PrepareSignedGaslessCommentRequestBodySchema.safeParse(await req.json());

    if (!parsedBodyResult.success) {
      return new JSONResponse(
        BadRequestResponseSchema,
        parsedBodyResult.error.flatten().fieldErrors,
        { status: 400 },
      );
    }

    const passedCommentData = parsedBodyResult.data;
    const {
      content,
      author,
      metadata,
      chainConfig,
      submitIfApproved,
      commentType,
    } = passedCommentData;

    if (env.COMMENTS_INDEXER_URL) {
      if (
        await isMuted({
          address: author,
          apiUrl: env.COMMENTS_INDEXER_URL,
        })
      ) {
        return new JSONResponse(
          ErrorResponseSchema,
          { error: "Author is muted" },
          { status: 403 },
        );
      }
    }

    const commentData = createCommentData({
      app: signer.address,
      author,
      content,
      ...("parentId" in passedCommentData
        ? {
            parentId: passedCommentData.parentId,
          }
        : {
            targetUri: passedCommentData.targetUri,
          }),
      metadata,
      commentType,
    });

    const typedCommentData = createCommentTypedData({
      commentData,
      chainId: chainConfig.chain.id,
    });

    const signature = await signer.signTypedData(typedCommentData);
    const hash = hashTypedData(typedCommentData);

    if (submitIfApproved) {
      const submitterAccount = await getGaslessSubmitter();
      const walletClient = createWalletClient({
        account: submitterAccount,
        chain: chainConfig.chain,
        transport: http(getRpcUrl(chainConfig.chain.id)),
      }).extend(publicActions);

      // Check approval on chain
      const hasApproval = await isApproved({
        app: signer.address,
        author,
        readContract: walletClient.readContract,
      });

      if (hasApproval) {
        // Verify app signature
        const isAppSignatureValid = await walletClient.verifyTypedData({
          ...typedCommentData,
          signature,
          address: signer.address,
        });

        if (!isAppSignatureValid) {
          console.error("Invalid app signature");

          return new JSONResponse(
            BadRequestResponseSchema,
            { appSignature: ["Invalid app signature"] },
            { status: 400 },
          );
        }

        const { txHash } = await postCommentWithSig({
          comment: typedCommentData.message,
          appSignature: signature,
          writeContract: walletClient.writeContract,
        });

        return new JSONResponse(
          PreparedGaslessPostCommentOperationApprovedResponseSchema,
          {
            txHash,
            id: hash,
            appSignature: signature,
            commentData: { ...commentData, id: hash },
            chainId: chainConfig.chain.id as keyof typeof SUPPORTED_CHAINS,
          },
          {
            jsonReplacer: bigintReplacer,
          },
        );
      }
    }

    return new JSONResponse(
      PreparedSignedGaslessPostCommentNotApprovedResponseSchema,
      {
        signTypedDataParams: typedCommentData,
        id: hash,
        appSignature: signature,
        commentData: { ...commentData, id: hash },
        chainId: chainConfig.chain.id as keyof typeof SUPPORTED_CHAINS,
      },
      {
        jsonReplacer: bigintReplacer,
      },
    );
  } catch (e) {
    if (e instanceof GaslessNotAvailableError) {
      return new JSONResponse(
        ErrorResponseSchema,
        { error: "Not Found" },
        { status: 404 },
      );
    }

    console.error("Error in prepare endpoint:", e);

    return new JSONResponse(
      ErrorResponseSchema,
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
