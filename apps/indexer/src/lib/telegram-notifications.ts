import { tryAsync } from "./try-async";
import { env } from "../env";
import { generateHMACUrl } from "../utils/hmac";
import type {
  WebhookRequestBodyApproveCommentSchemaType,
  WebhookRequestBodyRejectCommentSchemaType,
} from "./schemas";
import type { Hex } from "@ecp.eth/sdk/schemas";

interface CommentPendingModeration {
  id: Hex;
  authorAddress: string;
  content: string;
  targetUri: string;
}

export function notifyCommentPendingModeration(
  comment: CommentPendingModeration
) {
  return tryAsync(
    async () => {
      if (!env.MODERATION_ENABLED || !env.MODERATION_ENABLE_NOTIFICATIONS) {
        console.warn(
          "Moderation notifications are disabled, skipping notification"
        );
        return;
      }

      if (
        !env.MODERATION_TELEGRAM_BOT_TOKEN ||
        !env.MODERATION_TELEGRAM_CHANNEL_ID
      ) {
        console.warn("Telegram configuration missing, skipping notification");
        return;
      }

      const indexerUrl = new URL("/api/webhook", env.MODERATION_INDEXER_URL);

      const approveBody: WebhookRequestBodyApproveCommentSchemaType = {
        type: "approve",
        commentId: comment.id,
      };

      const rejectBody: WebhookRequestBodyRejectCommentSchemaType = {
        type: "reject",
        commentId: comment.id,
      };

      const approveUri = generateHMACUrl(indexerUrl, {
        secret: env.WEBHOOK_SECRET,
        queryParams: {
          c: JSON.stringify(approveBody),
        },
      });

      const rejectUri = generateHMACUrl(indexerUrl, {
        secret: env.WEBHOOK_SECRET,
        queryParams: {
          c: JSON.stringify(rejectBody),
        },
      });

      const message = `🆕 New comment pending moderation

ID: \`${comment.id}\`
Author: \`${comment.authorAddress}\`
Target: \`${comment.targetUri}\`

Content:
\`\`\`
${comment.content}
\`\`\`

Approve URI: ${approveUri}
Reject URI: ${rejectUri}
`;

      const response = await fetch(
        `https://api.telegram.org/bot${env.MODERATION_TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: env.MODERATION_TELEGRAM_CHANNEL_ID,
            text: message,
            parse_mode: "Markdown",
            link_preview_options: {
              is_disabled: true,
            },
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "Approve",
                    url: approveUri,
                  },
                  {
                    text: "Reject",
                    url: rejectUri,
                  },
                ],
              ],
            },
          }),
        }
      );

      if (!response.ok) {
        console.error(await response.text());
        throw new Error(
          `Failed to send Telegram notification: ${response.statusText}`
        );
      }
    },
    {
      onError(error) {
        console.error(error);
      },
    }
  );
}
