import setupGetComments from "./comments/get";
import setupGetCommentReplies from "./comments/replies/get";
import setupGetApprovals from "./approvals/get";
import { OpenAPIHono } from "@hono/zod-openapi";
import { setupGetAuthor } from "./authors/get";

export default function setupRestAPI(app: OpenAPIHono) {
  setupGetComments(app);
  setupGetCommentReplies(app);
  setupGetApprovals(app);
  setupGetAuthor(app);
}
