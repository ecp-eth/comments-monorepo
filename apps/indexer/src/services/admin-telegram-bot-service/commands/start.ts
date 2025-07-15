import type {
  IAdminTelegramBotServiceCommand,
  IAdminTelegramBotServiceCommand_RegisterOptions,
} from "../types";

export class StartCommand implements IAdminTelegramBotServiceCommand {
  getDefinition() {
    return {
      command: "start",
      description: "👋 Start the bot",
      help: "`/start` \\- Start the bot",
    };
  }

  register({ bot }: IAdminTelegramBotServiceCommand_RegisterOptions) {
    bot.command("start", async (ctx) => {
      await ctx.reply("👋 Welcome to the ECP Indexer admin bot!");
    });
  }
}
