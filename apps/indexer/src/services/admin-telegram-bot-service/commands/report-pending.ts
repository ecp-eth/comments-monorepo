import type {
  IAdminTelegramBotServiceCommand,
  IAdminTelegramBotServiceCommand_RegisterOptions,
} from "../types";
import { renderReport } from "./report-helpers";
import { reportMenu } from "./report-menu";

/**
 * This command must be registered after ReportCommand because of menu registration.
 */
export class ReportPendingCommand implements IAdminTelegramBotServiceCommand {
  getDefinition() {
    return {
      command: "report_pending",
      description: "📋 Returns a pending report if any",
      help: "`/report_pending` \\- Returns a pending report if any",
    };
  }

  register({ bot }: IAdminTelegramBotServiceCommand_RegisterOptions) {
    bot.command("report_pending", async (ctx) => {
      const report = await ctx.commentManagementDbService.getPendingReport();

      if (!report) {
        return ctx.reply("✅ No pending reports found.");
      }

      const message = renderReport(report);

      // pass report id for menu
      ctx.match = report.id;

      await ctx.reply(message.text, {
        entities: message.entities,
        reply_markup: reportMenu,
      });
    });
  }
}
