import z from "zod";
import {
  ApprovalEvents,
  ApprovalEventsFromDbToOpenApiSchema,
} from "./approval/schemas.ts";
import {
  ChannelEvents,
  ChannelEventsFromDbToOpenApiSchema,
} from "./channel/schemas.ts";
import {
  CommentEvents,
  CommentEventsFromDbToOpenApiSchema,
} from "./comment/schemas.ts";
import { TestEvents, TestEventDbToOpenApiSchema } from "./test/schemas.ts";

export const AllEventsDbToOpenApiSchema = z.discriminatedUnion("event", [
  ...ApprovalEventsFromDbToOpenApiSchema,
  ...ChannelEventsFromDbToOpenApiSchema,
  ...CommentEventsFromDbToOpenApiSchema,
  TestEventDbToOpenApiSchema,
] as const);

export const EventNames = [
  ...ApprovalEvents,
  ...ChannelEvents,
  ...CommentEvents,
  ...TestEvents,
] as const;

export const EventNamesSchema = z.enum(EventNames);
