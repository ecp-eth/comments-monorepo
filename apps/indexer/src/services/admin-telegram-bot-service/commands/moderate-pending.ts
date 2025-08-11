import type {
  IAdminTelegramBotServiceCommand,
  IAdminTelegramBotServiceCommand_RegisterOptions,
} from "../types";
import {
  commentModerationCommandToPayload,
  renderComment,
} from "./moderate-helpers";
import { moderateMenu } from "./moderate-menu";

/**
 * This command must be registered after ModerateCommand because of menu registration.
 */
export class ModeratePendingCommand implements IAdminTelegramBotServiceCommand {
  getDefinition() {
    return {
      command: "moderate_pending",
      description: "🔧 Moderate pending comments",
      help: "`/moderate_pending` \\- List and moderate pending comments",
    };
  }

  register({ bot }: IAdminTelegramBotServiceCommand_RegisterOptions) {
    bot.command("moderate_pending", async (ctx) => {
      const pendingComment = await ctx.premoderationService.getPendingComment();

      if (!pendingComment) {
        return ctx.reply("✅ No pending comments found.");
      }

      const author = await ctx.resolveAuthor(pendingComment.author);

      const message = renderComment(pendingComment, author);

      // Set the context match to the command menu
      ctx.match = commentModerationCommandToPayload({
        action: "init",
        commentId: pendingComment.id,
      });

      await ctx.reply(message.text, {
        entities: message.entities,
        reply_markup: moderateMenu,
      });
    });
  }
}
