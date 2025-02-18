import { z } from "zod";
import { HexSchema, CommentDataSchema } from "@ecp.eth/sdk/schemas";

const CommentDataWithIdSchema = CommentDataSchema.extend({
  id: HexSchema,
});

const CommentAuthorEnsDataSchema = z.object({
  name: z.string(),
  avatarUrl: z.string().url(),
});

const CommentAuthorSchema = z.object({
  address: HexSchema,
  ens: CommentAuthorEnsDataSchema.optional(),
});

const BaseCommentSchema = z.object({
  author: CommentAuthorSchema.nullable(),
  appSigner: HexSchema,
  chainId: z.number(),
  content: z.string(),
  deletedAt: z.coerce.date().nullable(),
  id: HexSchema,
  logIndex: z.number(),
  metadata: z.string(),
  parentId: HexSchema.nullable(),
  targetUri: z.string().nullable(),
  txHash: HexSchema,
  timestamp: z.coerce.date(),
});

type BaseCommentSchemaType = z.infer<typeof BaseCommentSchema>;

/**
 * Parses response from API endpoint for usage in client
 */
export const SignCommentResponseClientSchema = z.object({
  signature: HexSchema,
  hash: HexSchema,
  data: CommentDataWithIdSchema,
});

export type SignCommentResponseClientSchemaType = z.infer<
  typeof SignCommentResponseClientSchema
>;

export const PendingCommentOperationSchema = z
  .object({
    txHash: HexSchema,
    chainId: z.number().positive().int(),
    response: SignCommentResponseClientSchema,
  })
  .describe(
    "Contains information about pending operation so we can show that in comment list"
  );

export type PendingCommentOperationSchemaType = z.infer<
  typeof PendingCommentOperationSchema
>;

type CommentSchemaType = BaseCommentSchemaType & {
  pendingOperation?: PendingCommentOperationSchemaType;
  replies: {
    results: CommentSchemaType[];
    pagination: {
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
};

export const CommentSchema: z.ZodType<CommentSchemaType> =
  BaseCommentSchema.extend({
    replies: z.object({
      results: z.lazy(() => CommentSchema.array()),
      pagination: z.object({
        limit: z.number(),
        offset: z.number(),
        hasMore: z.boolean(),
      }),
    }),
    pendingOperation: PendingCommentOperationSchema.optional(),
  });

export type Comment = z.infer<typeof CommentSchema>;

export const CommentPageSchema = z.object({
  results: CommentSchema.array(),
  pagination: z.object({
    limit: z.number(),
    offset: z.number(),
    hasMore: z.boolean(),
  }),
});

export type CommentPageSchemaType = z.infer<typeof CommentPageSchema>;

export const SignCommentPayloadRequestSchema = z.object({
  author: HexSchema,
  content: z.string().trim().nonempty(),
  targetUri: z.string().url(),
  parentId: HexSchema.optional(),
  chainId: z.number(),
});

export type SignCommentPayloadRequestSchemaType = z.infer<
  typeof SignCommentPayloadRequestSchema
>;

/**
 * Parses output from API endpoint
 */
export const SignCommentResponseServerSchema = z.object({
  signature: HexSchema,
  hash: HexSchema,
  data: CommentDataWithIdSchema.omit({ nonce: true, deadline: true }).extend({
    nonce: z.string().regex(/\d+/),
    deadline: z.string().regex(/\d+/),
  }),
});

export const ListCommentsSearchParamsSchema = z.object({
  targetUri: z.string().url(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const ListCommentRepliesSearchParamsSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const ListCommentsQueryDataSchema = z.object({
  pages: CommentPageSchema.array(),
  pageParams: z.unknown().array(),
});

export type ListCommentsQueryDataSchemaType = z.infer<
  typeof ListCommentsQueryDataSchema
>;

export const EmbedConfigThemeColorSchema = z
  .string()
  .describe(
    "HSL color value, it is passed to hsl() css function. For example: 0 0 0%"
  );

export const EmbedConfigThemePaletteSchema = z.object({
  background: EmbedConfigThemeColorSchema.optional(),
  foreground: EmbedConfigThemeColorSchema.optional().describe(
    'Text on "background" color'
  ),
  primary: EmbedConfigThemeColorSchema.optional().describe(
    '"primary" background color'
  ),
  "primary-foreground": EmbedConfigThemeColorSchema.optional().describe(
    'Text on "primary" background'
  ),
  secondary: EmbedConfigThemeColorSchema.optional().describe(
    '"secondary" background color'
  ),
  "secondary-foreground": EmbedConfigThemeColorSchema.optional().describe(
    'Text on "secondary" background'
  ),
  destructive: EmbedConfigThemeColorSchema.optional().describe(
    '"destructive" background color, or text color for error messages'
  ),
  "destructive-foreground": EmbedConfigThemeColorSchema.optional().describe(
    'Text on "destructive" background'
  ),
  "muted-foreground":
    EmbedConfigThemeColorSchema.optional().describe('"muted" text'),
  ring: EmbedConfigThemeColorSchema.optional().describe(
    "Color used by interactive elements like button when they are focused"
  ),
});

export type EmbedConfigThemePaletteSchemaType = z.infer<
  typeof EmbedConfigThemePaletteSchema
>;

export const EmbedConfigThemeColorsSchema = z.object({
  light: EmbedConfigThemePaletteSchema.optional(),
  dark: EmbedConfigThemePaletteSchema.optional(),
});

export type EmbedConfigThemeColorsSchemaType = z.infer<
  typeof EmbedConfigThemeColorsSchema
>;

export const EmbedConfigThemeSchema = z.object({
  mode: z
    .enum(["light", "dark"])
    .optional()
    .describe(
      'Theme mode, "light" or "dark". Defaults to prefers-color-scheme if omitted.'
    ),
  colors: EmbedConfigThemeColorsSchema.optional(),
});

export type EmbedConfigThemeSchemaType = z.infer<typeof EmbedConfigThemeSchema>;

export const EmbedConfigSchema = z.object({
  theme: EmbedConfigThemeSchema.optional(),
});

export type EmbedConfigSchemaType = z.infer<typeof EmbedConfigSchema>;
