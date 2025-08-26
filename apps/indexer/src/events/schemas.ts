import z from "zod";
import { ApprovalEvents } from "./approval/schemas.ts";
import { ChannelEvents } from "./channel/schemas.ts";
import { CommentEvents } from "./comment/schemas.ts";
import { TestEvents } from "./test/schemas.ts";

export const EventNames = [
  ...ApprovalEvents,
  ...ChannelEvents,
  ...CommentEvents,
  ...TestEvents,
] as const;

export const EventNamesSchema = z.enum(EventNames);
