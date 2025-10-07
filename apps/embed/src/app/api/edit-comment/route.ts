import { env } from "@/env";
import {
  EditCommentPayloadRequestSchema,
  EditCommentResponseSchema,
} from "@/lib/schemas";
import { guardAPIDeadline } from "@/lib/utils";
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
import {
  createPublicClient,
  createWalletClient,
  hashTypedData,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

export async function POST(req: Request) {
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
    comment: { commentId, content, author, chainId },
    authorSignature,
    deadline,
  } = passedCommentData;

  try {
    guardAPIDeadline(deadline);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
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
    metadata: [],
  });

  const typedEditCommentData = createEditCommentTypedData({
    author,
    edit: editCommentData,
    chainId,
  });

  const hash = hashTypedData(typedEditCommentData);

  const submitterAccount = privateKeyToAccount(env.SUBMITTER_PRIVATE_KEY);
  const submitterWalletClient = createWalletClient({
    account: submitterAccount,
    chain: selectedChain,
    transport: http(),
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
}
