import { env } from "@/env";
import {
  CommentPageSchema,
  ListCommentRepliesSearchParamsSchema,
} from "@/lib/schemas";
import { HexSchema } from "@ecp.eth/sdk/schemas";
import { NextRequest } from "next/server";
import { privateKeyToAccount } from "viem/accounts";
import { z } from "zod";

const paramsSchema = z.object({
  commentId: HexSchema,
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const paramsParseResult = paramsSchema.safeParse(await params);

  if (!paramsParseResult.success) {
    return Response.json(
      {
        errors: paramsParseResult.error.flatten().fieldErrors,
      },
      {
        status: 400,
      }
    );
  }

  const { commentId } = paramsParseResult.data;

  const parseSearchParamsResult =
    ListCommentRepliesSearchParamsSchema.safeParse(
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

  const { limit, offset } = parseSearchParamsResult.data;

  const account = privateKeyToAccount(env.APP_SIGNER_PRIVATE_KEY);

  const url = new URL(
    `/api/comments/${commentId}/replies`,
    env.COMMENTS_INDEXER_URL
  );
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
