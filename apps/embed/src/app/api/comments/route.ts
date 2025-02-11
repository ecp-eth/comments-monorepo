import { env } from "@/env";
import {
  CommentPageSchema,
  ListCommentsSearchParamsSchema,
} from "@/lib/schemas";
import { NextRequest } from "next/server";
import { privateKeyToAccount } from "viem/accounts";

export async function GET(req: NextRequest) {
  const parseSearchParamsResult = ListCommentsSearchParamsSchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams.entries())
  );

  if (!parseSearchParamsResult.success) {
    return Response.json(
      {
        errors: parseSearchParamsResult.error.flatten().fieldErrors,
      },
      {
        status: 400,
      }
    );
  }

  const { targetUri, limit, offset } = parseSearchParamsResult.data;

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
    console.error(res.status, await res.text());

    return Response.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }

  return Response.json(CommentPageSchema.parse(await res.json()));
}
