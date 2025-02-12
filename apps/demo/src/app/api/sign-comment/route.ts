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

export const POST = async (req: Request) => {
  let { content, targetUri, parentId, chainId, author } = await req.json();

  // Validate target URL is valid
  if (!targetUri.startsWith(process.env.APP_URL!)) {
    return Response.json({ error: "Invalid target URL" }, { status: 400 });
  }

  const account = privateKeyToAccount(
    process.env.APP_SIGNER_PRIVATE_KEY! as `0x${string}`
  );

  const chain = configChains[0];
  const transport = configTransports[chain.id];

  const nonce = await getNonce({
    author,
    appSigner: account.address,
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

  return Response.json({
    signature,
    hash,
    data: JSON.parse(JSON.stringify(commentData, bigintReplacer)),
  });
};
