import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import { commentReportsService } from "../../../../services";
import { APIErrorResponseSchema } from "../../../../lib/schemas";
import { CommentNotFoundError } from "../../../../services/errors";
import { createPublicClient } from "viem";
import { createReportCommentTypedData } from "@ecp.eth/sdk/comments";
import config from "../../../../../ponder.config";
import { getChainById } from "../../../../utils/getChainById";

const ReportCommentParamsSchema = z.object({
  commentId: HexSchema,
});

const ReportCommentBodySchema = z.object({
  reportee: HexSchema,
  message: z.string().max(200),
  signature: z.string(),
  chainId: z
    .number()
    .int()
    .positive()
    .refine(
      (chainId) => {
        return Object.keys(config.chains).includes(chainId.toString());
      },
      {
        message: `Invalid chain ID, must be one of: ${Object.keys(config.chains).join(", ")}`,
      },
    ),
});

const reportCommentRoute = createRoute({
  method: "post",
  path: "/api/comments/{commentId}/reports",
  tags: ["comments"],
  description: "Report a comment",
  request: {
    params: ReportCommentParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: ReportCommentBodySchema,
        },
      },
    },
  },
  responses: {
    204: {
      description: "Comment reported successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: APIErrorResponseSchema,
        },
      },
      description: "When request is not valid",
    },
    404: {
      content: {
        "application/json": {
          schema: APIErrorResponseSchema,
        },
      },
      description: "When comment is not found",
    },
  },
});

export function setupReportComment(app: OpenAPIHono) {
  app.openapi(reportCommentRoute, async (c) => {
    const { commentId } = c.req.valid("param");
    const { reportee, message, signature, chainId } = c.req.valid("json");

    try {
      // Create the typed data
      const typedData = createReportCommentTypedData({
        commentId,
        reportee,
        message,
        chainId,
      });

      const chainConfig = config.chains[chainId];

      if (!chainConfig?.transport) {
        return c.json(
          {
            error: "Chain not found",
          },
          400,
        );
      }

      // Create a public client to verify the signature
      const publicClient = createPublicClient({
        chain: getChainById(chainId),
        transport: chainConfig.transport,
      });

      // Verify the signature
      const isSignatureValid = await publicClient.verifyTypedData({
        ...typedData,
        signature: signature as `0x${string}`,
        address: reportee,
      });

      if (!isSignatureValid) {
        return c.json(
          {
            error: "Invalid signature",
          },
          400,
        );
      }

      await commentReportsService.report({
        commentId,
        reportee,
        message,
      });

      return c.newResponse(null, 204);
    } catch (error) {
      if (error instanceof CommentNotFoundError) {
        return error.getResponse();
      }

      throw error;
    }
  });

  return app;
}
