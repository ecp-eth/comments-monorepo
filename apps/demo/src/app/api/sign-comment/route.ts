import { hashTypedData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  bigintReplacer,
  createCommentData,
  createCommentSignTypedDataArgs,
  getNonce,
} from "@/lib/utils";
import {
  chains as configChains,
  transports as configTransports,
} from "../../../lib/wagmi";

export const POST = async (req: Request) => {
  // you can check if chainId is supported by your configuration
  // and use it instead, at the moment we are forcing the first chain
  const { content, targetUri, parentId, chainId, author } = await req.json();

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
    chainId: chain.id,
  });

  const signature = await account.signTypedData(signTypedDataArgs);

  const hash = hashTypedData(signTypedDataArgs);

  return Response.json({
    chainId: chain.id,
    signature,
    hash,
    data: JSON.parse(JSON.stringify(commentData, bigintReplacer)),
  });
};
