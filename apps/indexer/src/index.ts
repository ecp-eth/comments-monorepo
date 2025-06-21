import "./sentry";
import { ponder } from "ponder:registry";
import { initializeManagement } from "./management";
import { initializeApprovalEventsIndexing } from "./indexing/approvals";
import { initializeCommentEventsIndexing } from "./indexing/comments";
import { initializeChannelEventsIndexing } from "./indexing/channels";
import { moderationNotificationsService } from "./services";

await initializeManagement();
await moderationNotificationsService.initialize();

initializeCommentEventsIndexing(ponder);
initializeApprovalEventsIndexing(ponder);
initializeChannelEventsIndexing(ponder);
