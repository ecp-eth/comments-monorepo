import { bigintReplacer } from "@/lib/utils";
import { createCommentData, createCommentTypedData } from "@ecp.eth/sdk";
import { hashTypedData } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const POST = async (req: Request) => {
  const { content, targetUri, parentId, chainId, author } = await req.json();

  // Validate target URL is valid
  if (!targetUri.startsWith(process.env.APP_URL!)) {
    return Response.json({ error: "Invalid target URL" }, { status: 400 });
  }

  const account = privateKeyToAccount(
    process.env.APP_SIGNER_PRIVATE_KEY! as `0x${string}`
  );

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

  return Response.json({
    signature,
    hash,
    data: JSON.parse(JSON.stringify(commentData, bigintReplacer)),
  });
};
