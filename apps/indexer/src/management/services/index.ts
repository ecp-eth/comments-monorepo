import { env } from "../../env";
import { moderationNotificationsService } from "../../services";
import { CommentModerationService } from "./comment-moderation-service";

export const commentModerationService = new CommentModerationService({
  enabled: env.MODERATION_ENABLED,
  knownReactions: env.MODERATION_KNOWN_REACTIONS,
  notificationService: moderationNotificationsService,
});
