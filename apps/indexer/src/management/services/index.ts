import { env } from "../../env";
import {
  moderationNotificationsService,
  commentModerationClassifierService,
  premoderationService,
  commentDbService,
} from "../../services";
import { CommentModerationService } from "./comment-moderation-service";

export const commentModerationService = new CommentModerationService({
  knownReactions: env.MODERATION_KNOWN_REACTIONS,
  premoderationService,
  notificationService: moderationNotificationsService,
  classifierService: commentModerationClassifierService,
  commentDbService,
});
