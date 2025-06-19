import { env } from "../../env";
import { CommentModerationService } from "./comment-moderation-service";

export const commentModerationService = new CommentModerationService({
  enabled: env.MODERATION_ENABLED,
  knownReactions: env.MODERATION_KNOWN_REACTIONS,
});
