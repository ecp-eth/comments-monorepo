import "./sentry";
import { ponder } from "ponder:registry";
import { initializeManagement } from "./management";
import { initializeApprovalEventsIndexing } from "./indexing/approvals";
import { initializeCommentEventsIndexing } from "./indexing/comments";

await initializeManagement();

initializeCommentEventsIndexing(ponder);
initializeApprovalEventsIndexing(ponder);
