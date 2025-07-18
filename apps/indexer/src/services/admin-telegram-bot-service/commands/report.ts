import {
  type IAdminTelegramBotServiceCommand,
  type IAdminTelegramBotServiceCommand_RegisterOptions,
} from "../types";
import { z } from "zod";
import { renderReport, reportCommandToPayload } from "./report-helpers";
import { reportMenu } from "./report-menu";

export class ReportCommand implements IAdminTelegramBotServiceCommand {
  getDefinition() {
    return {
      command: "report",
      description: "📋 Manage comment reports",
      help: "`/report <reportId>` \\- Manage comment report",
    };
  }

  register({ bot }: IAdminTelegramBotServiceCommand_RegisterOptions) {
    bot.use(reportMenu);

    bot.command("report", async (ctx) => {
      const reportIdResult = z.string().uuid().trim().safeParse(ctx.match);

      if (!reportIdResult.success) {
        return ctx.reply(
          "❌ Invalid report ID format. Please provide a valid UUID.",
        );
      }

      const report = await ctx.commentManagementDbService.getReportById(
        reportIdResult.data,
      );

      if (!report) {
        return ctx.reply(
          "❌ Report not found. Please provide a valid report ID.",
        );
      }

      // pass for report menu
      ctx.match = reportCommandToPayload({
        action: "init",
        reportId: report.id,
      });

      const message = renderReport(
        report,
        await ctx.resolveAuthor(report.reportee),
      );

      await ctx.reply(message.text, {
        entities: message.entities,
        reply_markup: reportMenu,
      });
    });
  }
}
