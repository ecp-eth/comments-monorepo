import { env, getRpcUrl } from "@/lib/env";
import {
  GaslessNotAvailableError,
  getGaslessSigner,
  getGaslessSubmitter,
} from "@/lib/helpers";
import {
  BadRequestResponseSchema,
  ErrorResponseSchema,
  PrepareSignedGaslessEditCommentRequestBodySchema,
  PrepareGaslessEditCommentOperationResponseSchema,
  PreparedSignedGaslessEditCommentNotApprovedResponseSchema,
  PreparedSignedGaslessEditCommentApprovedResponseSchema,
} from "@/lib/schemas";
import { SUPPORTED_CHAINS } from "@ecp.eth/sdk";
import {
  createEditCommentData,
  createEditCommentTypedData,
  getNonce,
  isApproved,
  editCommentWithSig,
} from "@ecp.eth/sdk/comments";
import { isMuted } from "@ecp.eth/sdk/indexer";
import { bigintReplacer, JSONResponse } from "@ecp.eth/shared/helpers";
import {
  createPublicClient,
  createWalletClient,
  http,
  publicActions,
} from "viem";

/**
 * Prepares a gasless edit comment for sending by the `send` endpoint (/api/edit-comment/gasless/send).
 */
export async function POST(
  req: Request,
): Promise<
  JSONResponse<
    | typeof PrepareGaslessEditCommentOperationResponseSchema
    | typeof BadRequestResponseSchema
    | typeof ErrorResponseSchema
  >
> {
  try {
    const signer = await getGaslessSigner();
    const parsedBodyResult =
      PrepareSignedGaslessEditCommentRequestBodySchema.safeParse(
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
    const {
      commentId,
      content,
      author,
      metadata,
      submitIfApproved,
      chainConfig,
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

    const publicClient = createPublicClient({
      chain: chainConfig.chain,
      transport: http(getRpcUrl(chainConfig.chain.id)),
    });

    const nonce = await getNonce({
      author,
      app: signer.address,
      readContract: publicClient.readContract,
    });

    const edit = createEditCommentData({
      commentId,
      content,
      app: signer.address,
      nonce,
      metadata,
    });

    const typedCommentData = createEditCommentTypedData({
      edit,
      chainId: chainConfig.chain.id,
      author,
    });

    const signature = await signer.signTypedData(typedCommentData);

    if (submitIfApproved) {
      const submitter = await getGaslessSubmitter();

      const submitterWalletClient = createWalletClient({
        account: submitter,
        chain: chainConfig.chain,
        transport: http(getRpcUrl(chainConfig.chain.id)),
      }).extend(publicActions);

      // Check approval on chain
      const hasApproval = await isApproved({
        app: signer.address,
        author,
        readContract: submitterWalletClient.readContract,
      });

      if (hasApproval) {
        // Verify app signature
        const isAppSignatureValid = await submitterWalletClient.verifyTypedData(
          {
            ...typedCommentData,
            signature,
            address: signer.address,
          },
        );

        if (!isAppSignatureValid) {
          return new JSONResponse(
            BadRequestResponseSchema,
            { appSignature: ["Invalid app signature"] },
            { status: 400 },
          );
        }

        const { txHash } = await editCommentWithSig({
          edit: typedCommentData.message,
          appSignature: signature,
          writeContract: submitterWalletClient.writeContract,
        });

        return new JSONResponse(
          PreparedSignedGaslessEditCommentApprovedResponseSchema,
          {
            txHash,
            appSignature: signature,
            chainId: chainConfig.chain.id as keyof typeof SUPPORTED_CHAINS,
            edit,
          },
          {
            jsonReplacer: bigintReplacer,
          },
        );
      }
    }

    return new JSONResponse(
      PreparedSignedGaslessEditCommentNotApprovedResponseSchema,
      {
        signTypedDataParams: typedCommentData,
        appSignature: signature,
        chainId: chainConfig.chain.id as keyof typeof SUPPORTED_CHAINS,
        edit,
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

    console.error("Error in edit comment gasless prepare endpoint:", e);

    return new JSONResponse(
      ErrorResponseSchema,
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
