import * as Sentry from "@sentry/node";

import { ponder } from "ponder:registry";
import { initializeManagement } from "./management";
import { initializeApprovalEventsIndexing } from "./indexing/approvals";
import { initializeCommentEventsIndexing } from "./indexing/comments";
import { env } from "./env";

Sentry.init({
  dsn: env.SENTRY_DSN,
});

await initializeManagement();

initializeCommentEventsIndexing(ponder);
initializeApprovalEventsIndexing(ponder);
