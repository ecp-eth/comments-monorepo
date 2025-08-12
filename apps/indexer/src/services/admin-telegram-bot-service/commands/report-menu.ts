import { Menu } from "@grammyjs/menu";
import { MenuId, type AdminTelegramBotServiceContext } from "../types";
import type { CommentReportStatus } from "../../../management/types";
import {
  renderReport,
  reportCommandParser,
  reportCommandToPayload,
  reportStatusToString,
} from "./report-helpers";
import { b, fmt } from "@grammyjs/parse-mode";

export const reportMenu = new Menu<AdminTelegramBotServiceContext>(
  MenuId.REPORT_MAIN_MENU,
)
  .submenu(
    {
      text: "Change status",
      payload(ctx) {
        const { reportId } = reportCommandParser.parse(ctx.match);

        return reportCommandToPayload({
          action: "openChangeStatus",
          reportId,
        });
      },
    },
    MenuId.REPORT_CHANGE_STATUS_SUBMENU,
  )
  .text("Cancel", async (ctx) => {
    await ctx.deleteMessage();
  });

const reportChangeStatusMenu = new Menu<AdminTelegramBotServiceContext>(
  MenuId.REPORT_CHANGE_STATUS_SUBMENU,
)
  .dynamic(async (ctx, range) => {
    const command = reportCommandParser.parse(ctx.match);
    const report = await ctx.reportsService.getReportById(command.reportId);

    if (!report) {
      return;
    }

    const statuses: CommentReportStatus[] = ["pending", "resolved", "closed"];

    for (const status of statuses) {
      if (status === report.status) {
        continue;
      }

      range.text(
        {
          text: reportStatusToString(status),
          payload() {
            return reportCommandToPayload({
              action: "changeStatus",
              reportId: command.reportId,
              status,
            });
          },
        },
        async (ctx) => {
          const command = reportCommandParser.parse(ctx.match);

          if (command.action !== "changeStatus") {
            throw new Error(`Expected change status command`);
          }

          const report = await ctx.reportsService.getReportById(
            command.reportId,
          );

          if (!report) {
            await ctx.editMessageText("❌ Report not found.");

            return ctx.menu.close();
          }

          const nextStatus = command.status;

          if (report.status === nextStatus) {
            const message = fmt`⚠️ Report is already in status ${b}${reportStatusToString(
              nextStatus,
            )}${b}`;

            await ctx.editMessageText(message.text, {
              entities: message.entities,
            });

            return ctx.menu.back();
          }

          const updatedReport = await ctx.reportsService.changeStatus({
            reportId: report.id,
            status: nextStatus,
            callbackQuery: undefined, // handled grammy
          });

          const message = renderReport(
            updatedReport,
            await ctx.resolveAuthor(updatedReport.reportee),
          );

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
    payload(ctx) {
      const { reportId } = reportCommandParser.parse(ctx.match);

      return reportCommandToPayload({
        action: "back",
        reportId,
      });
    },
  });

reportMenu.register(reportChangeStatusMenu);
