import type { IndexerAPICommentModerationStatusSchemaType } from "@ecp.eth/sdk/indexer/schemas";

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
