import { CommentsResponse } from "../../../lib/types";
import { privateKeyToAccount } from "viem/accounts";

export const GET = async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("targetUrl");

  if (!targetUrl) {
    return Response.json({ error: "Target URL is required" }, { status: 400 });
  }

  const account = privateKeyToAccount(
    process.env.APP_SIGNER_PRIVATE_KEY! as `0x${string}`
  );

  const url = new URL(`${process.env.COMMENTS_INDEXER_URL!}/api/comments`);
  url.searchParams.set("targetUrl", targetUrl);
  url.searchParams.set("appSigner", account.address);

  const res = await fetch(url);

  if (!res.ok) {
    console.error(res.status, await res.text());
    return Response.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }

  const data: CommentsResponse = await res.json();

  return Response.json(data);
};
