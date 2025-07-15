import { Menu } from "@grammyjs/menu";
import { MenuId, type AdminTelegramBotServiceContext } from "../types";
import type { CommentReportStatus } from "../../../management/types";
import {
  renderReport,
  reportChangeStatusCommandParser,
  reportChangeStatusCommandToPayload,
  reportStatusToString,
  uuidFromBase64OrDirect,
  uuidToPayload,
} from "./report-helpers";
import { b, fmt } from "@grammyjs/parse-mode";

export const reportMenu = new Menu<AdminTelegramBotServiceContext>(
  MenuId.REPORT_MAIN_MENU,
)
  .submenu(
    {
      text: "Change status",
      payload(ctx) {
        const reportId = uuidFromBase64OrDirect.parse(ctx.match);

        return uuidToPayload(reportId);
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
    const reportId = uuidFromBase64OrDirect.parse(ctx.match);
    const report = await ctx.commentManagementDbService.getReportById(reportId);

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
          payload(ctx) {
            const reportId = uuidFromBase64OrDirect.parse(ctx.match);

            return reportChangeStatusCommandToPayload(reportId, status);
          },
        },
        async (ctx) => {
          const { reportId, nextStatus } =
            reportChangeStatusCommandParser.parse(ctx.match);

          const report =
            await ctx.commentManagementDbService.getReportById(reportId);

          if (!report) {
            await ctx.editMessageText("❌ Report not found.");

            return ctx.menu.close();
          }

          if (report.status === nextStatus) {
            const message = fmt`⚠️ Report is already in status ${b}${reportStatusToString(
              nextStatus,
            )}${b}`;

            await ctx.editMessageText(message.text, {
              entities: message.entities,
            });

            return ctx.menu.back();
          }

          const updatedReport =
            await ctx.commentManagementDbService.updateReportStatus(
              reportId,
              nextStatus,
            );

          const message = renderReport(updatedReport);

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
      const reportId = uuidFromBase64OrDirect.parse(ctx.match);

      return uuidToPayload(reportId);
    },
  });

reportMenu.register(reportChangeStatusMenu);
