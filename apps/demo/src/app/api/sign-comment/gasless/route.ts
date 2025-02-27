import { JSONResponse } from "@/lib/json-response";
import {
  BadRequestResponseSchema,
  GaslessPostCommentRequestBodySchema,
  GaslessPostCommentResponseSchema,
  InternalServerErrorResponseSchema,
} from "@/lib/schemas";
import { resolveSubmitterAccount } from "@/lib/submitter";
import {
  chains as configChains,
  transports as configTransports,
} from "@/lib/wagmi";
import { COMMENTS_V1_ADDRESS, CommentsV1Abi } from "@ecp.eth/sdk";
import { createWalletClient, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export async function POST(
  req: Request
): Promise<
  JSONResponse<
    | typeof GaslessPostCommentResponseSchema
    | typeof BadRequestResponseSchema
    | typeof InternalServerErrorResponseSchema
  >
> {
  const parsedBodyResult = GaslessPostCommentRequestBodySchema.safeParse(
    await req.json()
  );

  if (!parsedBodyResult.success) {
    return new JSONResponse(
      BadRequestResponseSchema,
      parsedBodyResult.error.flatten().fieldErrors,
      { status: 400 }
    );
  }

  const { signTypedDataParams, appSignature, authorSignature } =
    parsedBodyResult.data;

  // Check that signature is from the app signer
  const appSigner = privateKeyToAccount(
    process.env.APP_SIGNER_PRIVATE_KEY! as `0x${string}`
  );

  // Can be any account with funds for gas on desired chain
  const submitterAccount = await resolveSubmitterAccount();

  const chain = configChains[0];
  const transport = configTransports[chain.id as keyof typeof configTransports];

  const walletClient = createWalletClient({
    account: submitterAccount,
    chain,
    transport,
  }).extend(publicActions);

  const isAppSignatureValid = await walletClient.verifyTypedData({
    ...signTypedDataParams,
    signature: appSignature,
    address: appSigner.address,
  });

  if (!isAppSignatureValid) {
    console.log("verifying app signature failed", {
      ...signTypedDataParams,
      signature: appSignature,
      address: appSigner.address,
    });

    return new JSONResponse(
      BadRequestResponseSchema,
      { signature: ["Invalid app signature"] },
      { status: 400 }
    );
  }

  try {
    const txHash = await walletClient.writeContract({
      abi: CommentsV1Abi,
      address: COMMENTS_V1_ADDRESS,
      functionName: "postComment",
      args: [
        {
          appSigner: signTypedDataParams.message.appSigner,
          author: signTypedDataParams.message.author,
          content: signTypedDataParams.message.content,
          metadata: signTypedDataParams.message.metadata,
          parentId: signTypedDataParams.message.parentId,
          targetUri: signTypedDataParams.message.targetUri,
          deadline: signTypedDataParams.message.deadline,
          nonce: signTypedDataParams.message.nonce,
        },
        authorSignature,
        appSignature,
      ],
    });

    return new JSONResponse(GaslessPostCommentResponseSchema, { txHash });
  } catch (error) {
    console.error(error);

    return new JSONResponse(
      InternalServerErrorResponseSchema,
      { error: "Failed to post comment" },
      { status: 500 }
    );
  }
}
