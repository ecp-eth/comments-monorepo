import "./sentry";
import { ponder } from "ponder:registry";
import { initializeManagement } from "./management";
import { initializeApprovalEventsIndexing } from "./indexing/approvals";
import { initializeCommentEventsIndexing } from "./indexing/comments";
import { initializeChannelEventsIndexing } from "./indexing/channels";

await initializeManagement();

initializeCommentEventsIndexing(ponder);
initializeApprovalEventsIndexing(ponder);
initializeChannelEventsIndexing(ponder);
