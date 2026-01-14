import { z } from "zod";
import {
  dateToIsoStringSchema,
  EventFromChainDbToOpenApiSchema,
  EventFromChainSchema,
  EventV1Schema,
  EventV2Schema,
} from "../shared/schemas.ts";
import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import {
  EVENT_APPROVAL_ADDED,
  EVENT_APPROVAL_REMOVED,
  type ApprovalAddedEventSchema as OutputApprovalAddedEventSchema,
  type ApprovalRemovedEventSchema as OutputApprovalRemovedEventSchema,
} from "@ecp.eth/sdk/indexer/webhooks/schemas";

// TODO: Move to SDK when approval expired events are added to SDK
export const EVENT_APPROVAL_EXPIRED = "approval:expired" as const;

export const ApprovalEvents = [
  EVENT_APPROVAL_ADDED,
  EVENT_APPROVAL_REMOVED,
  EVENT_APPROVAL_EXPIRED,
] as const;

export type ApprovalEvent = (typeof ApprovalEvents)[number];

export const ApprovalAddedEventSchema = z.discriminatedUnion("version", [
  z
    .object({
      event: z.literal(EVENT_APPROVAL_ADDED satisfies ApprovalEvent),
      data: z.object({
        approval: z.object({
          id: z.string(),
          createdAt: dateToIsoStringSchema,
          updatedAt: dateToIsoStringSchema,
          author: HexSchema,
          app: HexSchema,
        }),
      }),
    })
    .merge(EventFromChainSchema)
    .merge(EventV1Schema),
  z
    .object({
      event: z.literal(EVENT_APPROVAL_ADDED satisfies ApprovalEvent),
      data: z.object({
        approval: z.object({
          id: z.string(),
          createdAt: dateToIsoStringSchema,
          updatedAt: dateToIsoStringSchema,
          author: HexSchema,
          app: HexSchema,
          expiresAt: dateToIsoStringSchema,
        }),
      }),
    })
    .merge(EventFromChainSchema)
    .merge(EventV2Schema),
]);

export const ApprovalAddedV1EventDbToOpenApiSchema = z
  .object({
    event: z.literal(EVENT_APPROVAL_ADDED satisfies ApprovalEvent),
    data: z.object({
      approval: z.object({
        id: z.string(),
        createdAt: z.string().datetime(),
        updatedAt: z.string().datetime(),
        author: HexSchema,
        app: HexSchema,
      }),
    }),
  })
  .merge(EventFromChainDbToOpenApiSchema)
  .merge(EventV1Schema);

export const ApprovalAddedV2EventDbToOpenApiSchema = z
  .object({
    event: z.literal(EVENT_APPROVAL_ADDED satisfies ApprovalEvent),
    data: z.object({
      approval: z.object({
        id: z.string(),
        createdAt: z.string().datetime(),
        updatedAt: z.string().datetime(),
        author: HexSchema,
        app: HexSchema,
        expiresAt: z.string().datetime(),
      }),
    }),
  })
  .merge(EventFromChainDbToOpenApiSchema)
  .merge(EventV2Schema);

export const ApprovalAddedEventDbToOpenApiSchema = z.discriminatedUnion(
  "version",
  [
    ApprovalAddedV1EventDbToOpenApiSchema,
    ApprovalAddedV2EventDbToOpenApiSchema,
  ],
);

export type ApprovalAddedEventInput = z.input<typeof ApprovalAddedEventSchema>;

export type ApprovalAddedEvent = z.infer<typeof ApprovalAddedEventSchema>;

({}) as unknown as z.input<
  typeof ApprovalAddedEventDbToOpenApiSchema
> satisfies ApprovalAddedEvent;

({}) as unknown as z.infer<
  typeof ApprovalAddedEventDbToOpenApiSchema
> satisfies ApprovalAddedEvent;

export const ApprovalRemovedEventSchema = z
  .object({
    event: z.literal(EVENT_APPROVAL_REMOVED satisfies ApprovalEvent),
    data: z.object({
      approval: z.object({
        id: z.string(),
      }),
    }),
  })
  .merge(EventFromChainSchema)
  .merge(EventV1Schema);

export const ApprovalRemovedEventDbToOpenApiSchema = z
  .object({
    event: z.literal(EVENT_APPROVAL_REMOVED satisfies ApprovalEvent),
    data: z.object({
      approval: z.object({
        id: z.string(),
      }),
    }),
  })
  .merge(EventFromChainDbToOpenApiSchema)
  .merge(EventV1Schema);

export type ApprovalRemovedEventInput = z.input<
  typeof ApprovalRemovedEventSchema
>;

export type ApprovalRemovedEvent = z.infer<typeof ApprovalRemovedEventSchema>;

({}) as unknown as z.input<
  typeof ApprovalRemovedEventDbToOpenApiSchema
> satisfies ApprovalRemovedEvent;

({}) as unknown as z.infer<
  typeof ApprovalRemovedEventDbToOpenApiSchema
> satisfies ApprovalRemovedEvent;

export const ApprovalExpiredEventSchema = z
  .object({
    event: z.literal(EVENT_APPROVAL_EXPIRED satisfies ApprovalEvent),
    chainId: z.number().int(),
    data: z.object({
      approval: z.object({
        id: z.string(),
        createdAt: dateToIsoStringSchema,
        updatedAt: dateToIsoStringSchema,
        author: HexSchema,
        app: HexSchema,
        expiresAt: dateToIsoStringSchema,
      }),
    }),
  })
  .merge(EventV1Schema);

export const ApprovalExpiredEventDbToOpenApiSchema = z
  .object({
    event: z.literal(EVENT_APPROVAL_EXPIRED satisfies ApprovalEvent),
    chainId: z.number().int(),
    data: z.object({
      approval: z.object({
        id: z.string(),
        createdAt: z.string().datetime(),
        updatedAt: z.string().datetime(),
        author: HexSchema,
        app: HexSchema,
        expiresAt: z.string().datetime(),
      }),
    }),
  })
  .merge(EventV1Schema);

export type ApprovalExpiredEventInput = z.input<
  typeof ApprovalExpiredEventSchema
>;

export type ApprovalExpiredEvent = z.infer<typeof ApprovalExpiredEventSchema>;

({}) as unknown as z.input<
  typeof ApprovalExpiredEventDbToOpenApiSchema
> satisfies ApprovalExpiredEvent;

({}) as unknown as z.infer<
  typeof ApprovalExpiredEventDbToOpenApiSchema
> satisfies ApprovalExpiredEvent;

// assert that the schema output is the same as input to sdk
({}) as unknown as ApprovalAddedEvent satisfies z.input<
  typeof OutputApprovalAddedEventSchema
>;
({}) as unknown as ApprovalRemovedEvent satisfies z.input<
  typeof OutputApprovalRemovedEventSchema
>;

/**
 * This is a list of all the approval events that are supported by the database to openapi schema converter.
 * It is used to convert the database to openapi schema.
 */
export const ApprovalEventsFromDbToOpenApiSchema = [
  ApprovalAddedEventDbToOpenApiSchema,
  ApprovalRemovedEventDbToOpenApiSchema,
  ApprovalExpiredEventDbToOpenApiSchema,
] as const;
