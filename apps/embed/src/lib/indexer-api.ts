import { env } from "@/env";
import { privateKeyToAccount } from "viem/accounts";
import { CommentPageSchema } from "./schemas";

export class IndexerAPIError extends Error {
  constructor(
    public statusCode: number,
    public response: Response
  ) {
    super("Indexer API returned an error");
  }
}

type FetchCommentsParams = {
  targetUri: string;
  limit?: number;
  offset?: number;
};

export async function fetchComments({
  targetUri,
  limit,
  offset,
}: FetchCommentsParams) {
  const account = privateKeyToAccount(env.APP_SIGNER_PRIVATE_KEY);

  const url = new URL("/api/comments", env.COMMENTS_INDEXER_URL);
  url.searchParams.set("targetUri", targetUri);
  url.searchParams.set("appSigner", account.address);

  if (limit) {
    url.searchParams.set("limit", limit.toString());
  }

  if (offset) {
    url.searchParams.set("offset", offset.toString());
  }

  const res = await fetch(url, {
    cache: "no-cache",
  });

  if (!res.ok) {
    throw new IndexerAPIError(res.status, res.clone());
  }

  return CommentPageSchema.parse(await res.json());
}
