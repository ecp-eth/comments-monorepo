import { HexSchema } from "@ecp.eth/sdk/core";
import type {
  IAdminTelegramBotServiceCommand,
  IAdminTelegramBotServiceCommand_RegisterOptions,
} from "../types.ts";
import { moderateMenu } from "./moderate-menu.ts";
import {
  commentModerationCommandToPayload,
  renderComment,
} from "./moderate-helpers.ts";

export class ModerateCommand implements IAdminTelegramBotServiceCommand {
  getDefinition() {
    return {
      command: "moderate",
      description: "🔧 Moderate a comment",
      help: "`/moderate <commentId>` \\- Moderate a comment",
    };
  }

  register({ bot }: IAdminTelegramBotServiceCommand_RegisterOptions) {
    bot.use(moderateMenu);

    bot.command("moderate", async (ctx) => {
      const commentId = HexSchema.safeParse(ctx.match);

      if (!commentId.success) {
        return ctx.reply(
          "❌ Invalid comment ID format. Please provide a valid hex string.",
        );
      }

      const comment = await ctx.premoderationService.getCommentById(
        commentId.data,
      );

      if (!comment) {
        return ctx.reply(
          "❌ Comment not found. Please provide a valid comment ID.",
        );
      }

      const message = renderComment(
        comment,
        await ctx.resolveAuthor(comment.author),
      );

      // Set the context match to the command menu
      ctx.match = commentModerationCommandToPayload({
        action: "init",
        commentId: comment.id,
      });

      await ctx.reply(message.text, {
        entities: message.entities,
        reply_markup: moderateMenu,
      });
    });
  }
}
