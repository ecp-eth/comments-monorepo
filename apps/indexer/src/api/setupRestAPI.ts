import setupGetComments from "./comments/get";
import setupGetCommentReplies from "./comments/replies/get";
import setupGetApprovals from "./approvals/get";
import { OpenAPIHono } from "@hono/zod-openapi";
import { setupGetAuthor } from "./authors/get";
import { setupMarkAuthorAsSpammer } from "./spam-accounts/post";
import { setupDeleteSpammer } from "./spam-accounts/delete";
import { setupGetSpammer } from "./spam-accounts/get";

export default function setupRestAPI(app: OpenAPIHono) {
  setupGetComments(app);
  setupGetCommentReplies(app);
  setupGetApprovals(app);
  setupGetAuthor(app);
  setupGetSpammer(app);
  setupDeleteSpammer(app);
  setupMarkAuthorAsSpammer(app);
}
