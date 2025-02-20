import { env } from "@/env";
import {
  SignCommentPayloadRequestSchema,
  SignCommentResponseServerSchema,
} from "@/lib/schemas";
import { bigintReplacer } from "@/lib/utils";
import { createCommentData, createCommentTypedData } from "@ecp.eth/sdk";
import { hashTypedData } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export async function POST(req: Request) {
  const { content, targetUri, parentId, chainId, author } =
    SignCommentPayloadRequestSchema.parse(await req.json());

  const account = privateKeyToAccount(env.APP_SIGNER_PRIVATE_KEY);

  const commentData = createCommentData({
    content,
    targetUri,
    parentId,
    author,
    appSigner: account.address,
  });

  const typedCommentData = createCommentTypedData({
    commentData,
    chainId,
  });

  const signature = await account.signTypedData(typedCommentData);

  const hash = hashTypedData(typedCommentData);

  return Response.json(
    SignCommentResponseServerSchema.parse({
      signature,
      hash,
      data: {
        id: hash,
        ...JSON.parse(JSON.stringify(commentData, bigintReplacer)),
      },
    })
  );
}
