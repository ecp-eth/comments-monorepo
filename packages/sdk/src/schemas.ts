import { z } from "zod";

export const HexSchema = z.custom<`0x${string}`>(
  (value) =>
    z
      .string()
      .regex(/^0x[0-9a-fA-F]+$/)
      .safeParse(value).success
);

export type Hex = z.infer<typeof HexSchema>;

export const CommentDataSchema = z.object({
  content: z.string(),
  metadata: z.string(),
  targetUri: z.string(),
  parentId: HexSchema,
  author: HexSchema,
  appSigner: HexSchema,
  nonce: z.coerce.bigint(),
  deadline: z.coerce.bigint(),
});

export type CommentData = z.infer<typeof CommentDataSchema>;

export const EmbedConfigThemeColorSchema = z
  .string()
  .describe("Valid CSS color value. For example hsl(0 0 0%) or #000000.");

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
  border: EmbedConfigThemeColorSchema.optional().describe(
    "Border color - used by sonner"
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

export const EmbedConfigThemeOtherSchema = z.object({
  radius: z.string().optional().describe("Border radius"),
});

export type EmbedConfigThemeOtherSchemaType = z.infer<
  typeof EmbedConfigThemeOtherSchema
>;

export const EmbedConfigThemeSchema = z.object({
  mode: z
    .enum(["light", "dark"])
    .optional()
    .describe(
      'Theme mode, "light" or "dark". Defaults to prefers-color-scheme if omitted.'
    ),
  colors: EmbedConfigThemeColorsSchema.optional(),
  other: EmbedConfigThemeOtherSchema.optional(),
});

export type EmbedConfigThemeSchemaType = z.infer<typeof EmbedConfigThemeSchema>;

/**
 * The zod schema for `EmbedConfigSchemaType`
 */
export const EmbedConfigSchema = z.object({
  /**
   * The theme of the embed. currently support `light`, `dark`, or custom colors.
   */
  theme: EmbedConfigThemeSchema.optional(),
});

/**
 * Custom configuration for `<CommentEmbed />` component.
 */
export type EmbedConfigSchemaType = z.infer<typeof EmbedConfigSchema>;

export const IndexerAPIAuthorEnsDataSchema = z.object({
  name: z.string(),
  avatarUrl: z.string().nullable(),
});

export type IndexerAPIAuthorEnsDataSchemaType = z.infer<
  typeof IndexerAPIAuthorEnsDataSchema
>;

export const IndexerAPIFarcasterDataSchema = z.object({
  fid: z.number().int(),
  pfpUrl: z.string().optional(),
  displayName: z.string().optional(),
  username: z.string().optional(),
});

export type IndexerAPIFarcasterDataSchemaType = z.infer<
  typeof IndexerAPIFarcasterDataSchema
>;

export const IndexerAPIAuthorDataSchema = z.object({
  address: HexSchema,
  ens: IndexerAPIAuthorEnsDataSchema.optional(),
  farcaster: IndexerAPIFarcasterDataSchema.optional(),
});

export type IndexerAPIAuthorDataSchemaType = z.infer<
  typeof IndexerAPIAuthorDataSchema
>;

export const IndexerAPICommentSchema = z.object({
  appSigner: HexSchema,
  author: IndexerAPIAuthorDataSchema,
  id: HexSchema,
  content: z.string(),
  chainId: z.number().int(),
  deletedAt: z.coerce.date().nullable(),
  logIndex: z.number().int(),
  metadata: z.string(),
  parentId: HexSchema.nullable(),
  targetUri: z.string(),
  timestamp: z.coerce.date(),
  txHash: HexSchema,
});

export type IndexerAPICommentSchemaType = z.infer<
  typeof IndexerAPICommentSchema
>;

export const IndexerAPIPaginationSchema = z.object({
  limit: z.number().int(),
  offset: z.number().int(),
  hasMore: z.boolean(),
});

export type IndexerAPIPaginationSchemaType = z.infer<
  typeof IndexerAPIPaginationSchema
>;

const IndxerAPICommentWithRepliesSchema = IndexerAPICommentSchema.extend({
  replies: z.object({
    results: z.array(IndexerAPICommentSchema),
    pagination: IndexerAPIPaginationSchema,
  }),
});

export const IndexerAPIListCommentsSchema = z.object({
  results: z.array(IndxerAPICommentWithRepliesSchema),
  pagination: IndexerAPIPaginationSchema,
});

export type IndexerAPIListCommentsSchemaType = z.infer<
  typeof IndexerAPIListCommentsSchema
>;

export const IndexerAPIListCommentRepliesSchema = z.object({
  results: z.array(IndexerAPICommentSchema),
  pagination: IndexerAPIPaginationSchema,
});

export type IndexerAPIListCommentRepliesSchemaType = z.infer<
  typeof IndexerAPIListCommentRepliesSchema
>;
