import { Bot, webhookCallback } from "grammy";
import type { Handler } from "hono";
import type { IAdminTelegramBotService, ResolveAuthorFunction } from "../types";
import type {
  AdminTelegramBotServiceContext,
  IAdminTelegramBotServiceCommand,
} from "./types";
import type { ManagementCommentDbService } from "../../management/services/comment-db-service";
import type { CommentDbService } from "../comment-db-service";

type AdminTelegramBotServiceConfig = {
  /**
   * List of user IDs that are allowed to interact with the bot.
   * This is used to restrict access to the bot's commands and features.
   */
  allowedUserIds: number[];
  /**
   * The token for the Telegram bot.
   * This token is provided by the BotFather when you create a new bot.
   */
  botToken: string;
  /**
   * Optional API root URL for the Telegram Bot API.
   * This can be used to connect to a custom Telegram Bot API server.
   * If not provided, the default Telegram Bot API will be used.
   */
  apiRootUrl?: string;
  /**
   * Webhook URL where the bot will receive updates.
   */
  webhookUrl: string;
  /**
   * Secret token for the webhook to verify requests.
   */
  webhookSecret: string;
  /**
   * List of commands to register with the bot.
   */
  commands: IAdminTelegramBotServiceCommand[];
  commentDbService: CommentDbService;
  commentManagementDbService: ManagementCommentDbService;
  resolveAuthor: ResolveAuthorFunction;
};

export class AdminTelegramBotService implements IAdminTelegramBotService {
  private bot: Bot<AdminTelegramBotServiceContext>;
  private allowedUserIds: number[];
  private webhookUrl: string;
  private webhookSecret: string;
  private commands: IAdminTelegramBotServiceCommand[] = [];

  constructor(config: AdminTelegramBotServiceConfig) {
    this.bot = new Bot<AdminTelegramBotServiceContext>(config.botToken, {
      client: {
        apiRoot: config.apiRootUrl,
      },
    });
    this.allowedUserIds = config.allowedUserIds;
    this.webhookUrl = config.webhookUrl;
    this.webhookSecret = config.webhookSecret;
    this.commands = config.commands;

    this.bot.use((ctx, next) => {
      ctx.commentManagementDbService = config.commentManagementDbService;
      ctx.commentDbService = config.commentDbService;
      ctx.resolveAuthor = config.resolveAuthor;

      return next();
    });

    this.bot.use((ctx, next) => {
      if (!ctx.from) {
        return;
      }

      if (!this.allowedUserIds.includes(ctx.from.id)) {
        return ctx.reply("❌ You are not authorized to use this bot.");
      }

      return next();
    });

    this.bot.catch((error) => {
      console.error("Error in AdminTelegramBotService:", error);
    });
  }

  async initialize(): Promise<void> {
    console.log("AdminTelegramBotService: initializing...");
    await this.bot.api.setWebhook(this.webhookUrl, {
      secret_token: this.webhookSecret,
    });

    // Register commands
    for (const command of this.commands) {
      command.register({ bot: this.bot });
    }

    await this.bot.api.setMyCommands([
      ...this.commands.map((cmd) => {
        const def = cmd.getDefinition();

        return {
          command: def.command,
          description: def.description,
        };
      }),
      { command: "help", description: "🙋‍♂️ Get help on how to use the bot" },
    ]);

    this.bot.command("help", async (ctx) => {
      const helpMessage = `
*Admin Bot Commands:*
${this.commands.map((cmd) => cmd.getDefinition().help).join("\n")}
`.trim();

      await ctx.reply(helpMessage, {
        parse_mode: "MarkdownV2",
      });
    });

    console.log("AdminTelegramBotService: initialized");
  }

  handleWebhookRequest: Handler = async (c) => {
    return webhookCallback(this.bot, "hono", {
      secretToken: this.webhookSecret,
    })(c);
  };
}
