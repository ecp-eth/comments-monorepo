import { env } from "@/env";
import {
  SignCommentPayloadRequestSchema,
  SignCommentResponseServerSchema,
} from "@/lib/schemas";
import { bigintReplacer } from "@/lib/utils";
import {
  chains as configChains,
  transports as configTransports,
} from "@/lib/wagmi";
import {
  createCommentData,
  createCommentSignTypedDataArgs,
  getNonce,
} from "@ecp.eth/sdk";
import { hashTypedData } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export async function POST(req: Request) {
  const { content, targetUri, parentId, chainId, author } =
    SignCommentPayloadRequestSchema.parse(await req.json());

  const account = privateKeyToAccount(env.APP_SIGNER_PRIVATE_KEY);

  const chain = configChains[0];
  const transport = configTransports[chain.id];

  const nonce = await getNonce({
    author,
    chain,
    transport,
  });

  const commentData = createCommentData({
    content,
    targetUri,
    parentId,
    author,
    appSigner: account.address,
    nonce,
  });

  const signTypedDataArgs = createCommentSignTypedDataArgs({
    commentData,
    chainId,
  });

  const signature = await account.signTypedData(signTypedDataArgs);

  const hash = hashTypedData(signTypedDataArgs);

  return Response.json(
    SignCommentResponseServerSchema.parse({
      signature,
      hash,
      data: JSON.parse(JSON.stringify(commentData, bigintReplacer)),
    })
  );
}
