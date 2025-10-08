import { z } from "@hono/zod-openapi";
import {
  OpenAPIBigintStringSchema,
  OpenAPIDateStringSchema,
  OpenAPIHexSchema,
} from "../../lib/schemas.ts";
import {
  IndexerAPIAuthorDataSchema,
  IndexerAPICommentOutputSchema,
} from "@ecp.eth/sdk/indexer";
import { NotificationTypeSchema } from "../../notifications/schemas.ts";

const BaseNotificationSchema = z.object({
  id: OpenAPIBigintStringSchema,
  createdAt: OpenAPIDateStringSchema,
  seen: z.boolean(),
  seenAt: OpenAPIDateStringSchema.nullable(),
  app: OpenAPIHexSchema,
  author: IndexerAPIAuthorDataSchema,
  comment: IndexerAPICommentOutputSchema.openapi({
    description:
      "The comment that has been created by the author. This comment triggered the notification.",
  }),
});

const AppNotificationReplyOutputSchema = z
  .object({
    type: z.literal("reply"),
    replyingTo: IndexerAPICommentOutputSchema,
  })
  .merge(BaseNotificationSchema);

const AppNotificationMentionOutputSchema = z
  .object({
    type: z.literal("mention"),
    mentionedUser: IndexerAPIAuthorDataSchema,
  })
  .merge(BaseNotificationSchema);

const AppNotificationReactionOutputSchema = z
  .object({
    type: z.literal("reaction"),
    reactingTo: IndexerAPICommentOutputSchema,
  })
  .merge(BaseNotificationSchema);

const AppNotificationQuoteOutputSchema = z
  .object({
    type: z.literal("quote"),
    quotedComment: IndexerAPICommentOutputSchema,
  })
  .merge(BaseNotificationSchema);

export const AppNotificationOutputSchema = z.discriminatedUnion("type", [
  AppNotificationReplyOutputSchema,
  AppNotificationMentionOutputSchema,
  AppNotificationReactionOutputSchema,
  AppNotificationQuoteOutputSchema,
]);

export const AppNotificationGetRequestQueryAppSchema = z
  .preprocess((val) => {
    if (typeof val === "string") {
      return val.split(",").map((app) => app.trim());
    }

    return val;
  }, OpenAPIHexSchema.array().max(20))
  .default([])
  .openapi({
    description: "Return only notifications created by this app signers",
    oneOf: [
      {
        type: "array",
        items: {
          type: "string",
          description: "an array of app signer public keys in hex format",
        },
      },
      {
        type: "string",
        description:
          "Comma separated list of app signer public keys in hex format",
      },
      {
        type: "string",
        description: "An app signer public key in hex format",
      },
    ],
  });

export const AppNotificationGetRequestQuerySeenSchema = z
  .enum(["true", "false", "1", "0"])
  .transform((val) => {
    if (val === "true" || val === "1") {
      return true;
    }

    return false;
  })
  .optional()
  .openapi({
    description:
      "Whether to include only seen or unseen notifications, if omitted or empty all notifications will be included",
    enum: ["true", "false", "1", "0"],
  });

export const AppNotificationGetRequestQueryTypeSchema = z
  .preprocess((val) => {
    if (typeof val === "string") {
      return val.split(",").map((type) => type.trim());
    }

    return val;
  }, NotificationTypeSchema.array())
  .default([])
  .openapi({
    description: "Return only notifications of this type",
    oneOf: [
      {
        type: "array",
        items: {
          type: "string",
          enum: NotificationTypeSchema.options,
        },
      },
      {
        type: "string",
        enum: NotificationTypeSchema.options,
      },
      {
        type: "string",
        description: "Comma separated list of notification types",
        example: "reply,mention,reaction,quote",
      },
    ],
  });
