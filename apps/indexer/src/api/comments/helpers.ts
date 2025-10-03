import type { IndexerAPICommentModerationStatusSchemaType } from "@ecp.eth/sdk/indexer/schemas";
import { type CommentModerationLabel } from "../../services/types";
import { and, or, sql, type SQL } from "drizzle-orm";
import schema from "ponder:schema";
import { env } from "../../env";

export function normalizeModerationStatusFilter(
  moderationStatus:
    | undefined
    | IndexerAPICommentModerationStatusSchemaType
    | IndexerAPICommentModerationStatusSchemaType[],
): IndexerAPICommentModerationStatusSchemaType[] {
  if (typeof moderationStatus === "string") {
    return [moderationStatus];
  }

  if (Array.isArray(moderationStatus) && moderationStatus.length > 0) {
    return moderationStatus;
  }

  return [];
}

export function convertExcludeModerationLabelsToConditions(
  excludeModerationLabels: CommentModerationLabel[],
): SQL | undefined {
  if (excludeModerationLabels.length === 0) {
    return;
  }

  const clauses: (SQL | undefined)[] = [];

  for (const label of excludeModerationLabels) {
    clauses.push(
      or(
        sql`NOT (${schema.comment.moderationClassifierResult} ? ${label})`,
        sql`(${schema.comment.moderationClassifierResult}->>${label})::float <= ${getModerationClassificationScoreThreshold(label)}`,
      ),
    );
  }

  return and(...clauses);
}

function getModerationClassificationScoreThreshold(
  label: CommentModerationLabel,
): number {
  const key =
    `MODERATION_CLASSIFICATION_${label.toUpperCase()}_THRESHOLD` as keyof typeof env;

  if (key in env && typeof env[key] === "number") {
    return env[key];
  }

  return env.MODERATION_DEFAULT_CLASSIFICATION_SCORE_THRESHOLD;
}
