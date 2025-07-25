import { setupGetChannel } from "./channels/[id]/get";
import { setupGetChannels } from "./channels/get";
import { setupGetComment } from "./comments/[commentId]/get";
import setupGetComments from "./comments/get";
import setupGetCommentReplies from "./comments/replies/get";
import setupGetApprovals from "./approvals/get";
import { OpenAPIHono } from "@hono/zod-openapi";
import { setupGetAuthor } from "./authors/get";
import { setupMarkAuthorAsMuted } from "./muted-accounts/post";
import { setupUnmuteAccount } from "./muted-accounts/delete";
import { setupGetMutedAccount } from "./muted-accounts/get";
import { setupGetPendingModerationComments } from "./moderate-comments/get";
import { setupChangeCommentModerationStatus } from "./moderate-comments/[commentId]/patch";
import { setupGetModerateComment } from "./moderate-comments/[commentId]/get";
import { setupWebhook } from "./webhook/post";
import { setupGetAutocomplete } from "./autocomplete/get";
import { setupReportComment } from "./comments/[commentId]/reports/post";
import { setupGetReports } from "./reports/get";
import { setupGetReport } from "./reports/[reportId]/get";
import { setupPatchReport } from "./reports/[reportId]/patch";
import { setupAdminBotWebhook } from "./webhook/bot/post";

export default function setupRestAPI(app: OpenAPIHono) {
  setupGetChannel(app);
  setupGetChannels(app);
  setupGetComment(app);
  setupGetComments(app);
  setupGetCommentReplies(app);
  setupGetApprovals(app);
  setupGetAuthor(app);
  setupGetMutedAccount(app);
  setupUnmuteAccount(app);
  setupMarkAuthorAsMuted(app);
  setupGetPendingModerationComments(app);
  setupChangeCommentModerationStatus(app);
  setupGetModerateComment(app);
  setupWebhook(app);
  setupGetAutocomplete(app);
  setupReportComment(app);
  setupGetReports(app);
  setupGetReport(app);
  setupPatchReport(app);
  setupAdminBotWebhook(app);

  return app;
}
