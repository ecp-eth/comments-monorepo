import type { IndexingFunctionArgs } from "ponder:registry";
import {
  type ApprovalAddedEvent,
  ApprovalAddedEventSchema,
  type ApprovalAddedEventInput,
  ApprovalRemovedEventSchema,
  type ApprovalRemovedEventInput,
  type ApprovalRemovedEvent,
} from "./schemas";
import type { ApprovalSelectType } from "ponder:schema";

export function ponderEventToApprovalAddedEvent({
  approval,
  event,
  context,
}: IndexingFunctionArgs<"CommentsV1:ApprovalAdded"> & {
  approval: ApprovalSelectType;
}): ApprovalAddedEvent {
  const uid = `approval:added:${context.chain.id}:${event.block.number}:${event.transaction.hash}:${event.log.logIndex}`;

  return ApprovalAddedEventSchema.parse({
    event: "approval:added",
    uid,
    version: 1,
    blockNumber: event.block.number,
    chainId: context.chain.id,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    data: {
      approval,
    },
  } satisfies ApprovalAddedEventInput);
}

export function ponderEventToApprovalRemovedEvent({
  approval,
  event,
  context,
}: IndexingFunctionArgs<"CommentsV1:ApprovalRemoved"> & {
  approval: ApprovalSelectType;
}): ApprovalRemovedEvent {
  const uid = `approval:removed:${context.chain.id}:${event.block.number}:${event.transaction.hash}:${event.log.logIndex}`;

  return ApprovalRemovedEventSchema.parse({
    event: "approval:removed",
    uid,
    version: 1,
    blockNumber: event.block.number,
    chainId: context.chain.id,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    data: {
      approval,
    },
  } satisfies ApprovalRemovedEventInput);
}
