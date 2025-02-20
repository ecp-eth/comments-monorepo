import { fetchComments, IndexerAPIError } from "@/lib/indexer-api";
import { ListCommentsSearchParamsSchema } from "@/lib/schemas";
import type { NextRequest } from "next/server";
import { z } from "zod";

export async function GET(req: NextRequest) {
  try {
    const { targetUri, limit, offset } = ListCommentsSearchParamsSchema.parse(
      Object.fromEntries(req.nextUrl.searchParams.entries())
    );

    const response = await fetchComments({
      targetUri,
      limit,
      offset,
    });

    return Response.json(response);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return Response.json(
        {
          errors: e.flatten().fieldErrors,
        },
        {
          status: 400,
        }
      );
    }

    if (e instanceof IndexerAPIError) {
      return Response.json(
        {
          error: "Failed to fetch comments",
          statusCode: e.statusCode,
          response: await e.response.text(),
        },
        { status: 500 }
      );
    }

    console.error(e);

    return Response.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}
