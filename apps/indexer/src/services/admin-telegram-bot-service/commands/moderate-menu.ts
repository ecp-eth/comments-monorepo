import { Menu } from "@grammyjs/menu";
import { AdminTelegramBotServiceContext, MenuId } from "../types";
import {
  commentModerationCommandToPayload,
  moderationCommandParser,
  moderationStatusToActionString,
  renderComment,
} from "./moderate-helpers";
import { CommentModerationStatus } from "../../../management/types";
import { b, fmt } from "@grammyjs/parse-mode";
import { renderToMarkdown } from "@ecp.eth/shared/renderer";
import { escapeTelegramMarkdownTextElement } from "../../../utils/escapeTelegramMarkdownTextElement";

export const moderateMenu = new Menu<AdminTelegramBotServiceContext>(
  MenuId.MODERATE_MAIN_MENU,
)
  .submenu(
    {
      text: "Change status",
      payload(ctx) {
        const { commentId } = moderationCommandParser.parse(ctx.match);

        return commentModerationCommandToPayload({
          action: "openChangeStatus",
          commentId,
        });
      },
    },
    MenuId.MODERATE_CHANGE_STATUS_SUBMENU,
  )
  .text(
    {
      text: "Show content",
      payload(ctx) {
        const command = moderationCommandParser.parse(ctx.match);

        return commentModerationCommandToPayload({
          action: "showCommentContent",
          commentId: command.commentId,
        });
      },
    },
    async (ctx) => {
      const command = moderationCommandParser.parse(ctx.match);

      if (command.action !== "showCommentContent") {
        throw new Error(`Expected show comment content command`);
      }

      const comment = await ctx.premoderationService.getCommentById(
        command.commentId,
      );

      if (!comment) {
        await ctx.editMessageText("❌ Comment not found.");

        return ctx.menu.close();
      }

      const renderResult = renderToMarkdown({
        content: comment.content,
        references: comment.references,
        maxLength: 4000,
        elementRenderers: {
          text: escapeTelegramMarkdownTextElement,
        },
      });

      await ctx.reply(renderResult.result, {
        parse_mode: "Markdown",
        reply_markup: moderateCommentPreviewMenu,
      });
    },
  )
  .text("Cancel", async (ctx) => {
    await ctx.deleteMessage();
  });

const moderateCommentPreviewMenu = new Menu<AdminTelegramBotServiceContext>(
  MenuId.MODERATE_COMMENT_PREVIEW_MENU,
).text("Close", async (ctx) => {
  await ctx.deleteMessage();
});

const moderateChangeStatusMenu = new Menu<AdminTelegramBotServiceContext>(
  MenuId.MODERATE_CHANGE_STATUS_SUBMENU,
)
  .dynamic(async (ctx, range) => {
    const command = moderationCommandParser.parse(ctx.match);

    const comment = await ctx.premoderationService.getCommentById(
      command.commentId,
    );

    if (!comment) {
      return;
    }

    const statuses: CommentModerationStatus[] = [
      "pending",
      "approved",
      "rejected",
    ];

    for (const status of statuses) {
      if (status === comment.moderationStatus) {
        continue;
      }

      range.text(
        {
          text: moderationStatusToActionString(status),
          payload() {
            return commentModerationCommandToPayload({
              action: "changeStatus",
              commentId: comment.id,
              status: status,
            });
          },
        },
        async (ctx) => {
          const command = moderationCommandParser.parse(ctx.match);

          if (command.action !== "changeStatus") {
            throw new Error(`Expected change status command`);
          }

          const nextStatus = command.status;
          const comment = await ctx.premoderationService.getCommentById(
            command.commentId,
          );

          if (!comment) {
            await ctx.editMessageText("❌ Comment not found.");

            return ctx.menu.close();
          }

          if (comment.moderationStatus === nextStatus) {
            const message = fmt`⚠️ Comment is already in status ${b}${nextStatus}${b}`;

            await ctx.editMessageText(message.text, {
              entities: message.entities,
            });

            return ctx.menu.close();
          }

          const updatedComment = await ctx.premoderationService.updateStatus({
            commentId: comment.id,
            commentRevision: comment.revision,
            status: nextStatus,
          });

          if (!updatedComment) {
            await ctx.editMessageText("❌ Failed to update comment status.");

            return ctx.menu.close();
          }

          const author = await ctx.resolveAuthor(updatedComment.author);

          const message = renderComment(updatedComment, author);

          await ctx.editMessageText(message.text, {
            entities: message.entities,
          });

          ctx.menu.back();
        },
      );
    }

    return range;
  })
  .back({
    text: "Back",
    payload: (ctx) => {
      const { commentId } = moderationCommandParser.parse(ctx.match);

      return commentModerationCommandToPayload({
        action: "back",
        commentId,
      });
    },
  });

moderateMenu.register(moderateChangeStatusMenu);
moderateMenu.register(moderateCommentPreviewMenu);
