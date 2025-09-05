import type {
  IAdminTelegramBotServiceCommand,
  IAdminTelegramBotServiceCommand_RegisterOptions,
} from "../types.ts";
import { renderReport, reportCommandToPayload } from "./report-helpers.ts";
import { reportMenu } from "./report-menu.ts";

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
      const report = await ctx.reportsService.getPendingReport();

      if (!report) {
        return ctx.reply("✅ No pending reports found.");
      }

      const message = renderReport(
        report,
        await ctx.resolveAuthor(report.reportee),
      );

      // pass for report menu
      ctx.match = reportCommandToPayload({
        action: "init",
        reportId: report.id,
      });

      await ctx.reply(message.text, {
        entities: message.entities,
        reply_markup: reportMenu,
      });
    });
  }
}
