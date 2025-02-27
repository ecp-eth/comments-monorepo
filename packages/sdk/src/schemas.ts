/**
 * Ethereum Comments Protocol SDK zod schemas
 * 
 * @module
 */
import { z } from "zod";
import { DOMAIN_NAME, DOMAIN_VERSION } from "./eip712.js";
import { COMMENTS_V1_ADDRESS } from "./constants.js";
import { EmbedConfigSupportedFont } from "./schemas.fonts.js";

export const HexSchema = z.custom<`0x${string}`>(
  (value) =>
    z
      .string()
      .regex(/^0x[0-9a-fA-F]+$/)
      .safeParse(value).success
);

/**
 * type for hex format string, e.g. `0x1234567890abcdef`
 */
export type Hex = z.infer<typeof HexSchema>;

export const CommentDataSchema = z.object({
  content: z.string(),
  metadata: z.string(),
  targetUri: z.string(),
  parentId: HexSchema,
  author: HexSchema,
  appSigner: HexSchema,
  salt: HexSchema,
  deadline: z.coerce.bigint(),
});

export type CommentData = z.infer<typeof CommentDataSchema>;

const CSSTransparentColorSchema = z
  .literal("transparent")
  .describe("Valid CSS transparent color value");

const CSSHexColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/)
  .describe("Valid CSS hex color value");

const CSSRGBColorSchema = z
  .string()
  .regex(/^rgba?\([0-9]{1,3},\s*[0-9]{1,3},\s*[0-9]{1,3}(,\s*[0-9]{1,3})?\)$/)
  .describe("Valid CSS RGB color value");

const CSSHSLColorSchema = z
  .string()
  .regex(
    /^hsla?\([0-9]{1,3}(deg)?,\s*[0-9]{1,3}%,\s*[0-9]{1,3}%(,\s*([0-9]?\.?[0-9]+|[0-9]{1,3}%))?\)$/
  )
  .describe("Valid CSS HSL color value");

const CSSColorSchema = z
  .union([
    CSSHexColorSchema,
    CSSRGBColorSchema,
    CSSHSLColorSchema,
    CSSTransparentColorSchema,
  ])
  .describe("Valid CSS hex, rgb(), rgba(), hsl() or hsl() color value");

const CSSSizeSchema = z
  .string()
  .regex(/^([0-9]*\.[0-9]+|[0-9]+)(px|em|rem|vh|vw|vmin|vmax|%)$/)
  .max(10)
  .describe("Valid CSS size value");

const CSSFontFamilySchema = z
  .string()
  .regex(/^[a-zA-Z0-9\s,\-"']+$/)
  .max(100)
  .describe("Valid CSS font-family value");

export const EmbedConfigThemePaletteSchema = z.object({
  background: CSSColorSchema.optional(),
  foreground: CSSColorSchema.optional().describe('Text on "background" color'),
  primary: CSSColorSchema.optional().describe('"primary" background color'),
  "primary-foreground": CSSColorSchema.optional().describe(
    'Text on "primary" background'
  ),
  secondary: CSSColorSchema.optional().describe('"secondary" background color'),
  "secondary-foreground": CSSColorSchema.optional().describe(
    'Text on "secondary" background'
  ),
  destructive: CSSColorSchema.optional().describe(
    '"destructive" background color, or text color for error messages'
  ),
  "destructive-foreground": CSSColorSchema.optional().describe(
    'Text on "destructive" background'
  ),
  "muted-foreground": CSSColorSchema.optional().describe('"muted" text'),
  ring: CSSColorSchema.optional().describe(
    "Color used by interactive elements like button when they are focused"
  ),
  border: CSSColorSchema.optional().describe("Border color - used by sonner"),
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
  radius: CSSSizeSchema.optional(),
});

export type EmbedConfigThemeOtherSchemaType = z.infer<
  typeof EmbedConfigThemeOtherSchema
>;

export const EmbedConfigFontSizeSchema = z
  .object({
    size: CSSSizeSchema.optional(),
    lineHeight: CSSSizeSchema.optional(),
  })
  .partial();

export const EmbedConfigFontSchema = z
  .object({
    fontFamily: z.union([
      z.object({
        system: CSSFontFamilySchema.describe("Font family available on system"),
      }),
      z.object({
        google: EmbedConfigSupportedFont.optional().describe(
          "Font family available on Google fonts"
        ),
      }),
    ]),
    sizes: z
      .object({
        base: EmbedConfigFontSizeSchema,
        "error-screen-title": EmbedConfigFontSizeSchema,
        "empty-screen-title": EmbedConfigFontSizeSchema,
        headline: EmbedConfigFontSizeSchema,
        xs: EmbedConfigFontSizeSchema,
        sm: EmbedConfigFontSizeSchema,
      })
      .partial(),
  })
  .partial();

export type EmbedConfigFontSchemaType = z.infer<typeof EmbedConfigFontSchema>;

export const EmbedConfigThemeSchema = z.object({
  mode: z
    .enum(["light", "dark"])
    .optional()
    .describe(
      'Theme mode, "light" or "dark". Defaults to prefers-color-scheme if omitted.'
    ),
  colors: EmbedConfigThemeColorsSchema.optional(),
  font: EmbedConfigFontSchema.optional(),
  other: EmbedConfigThemeOtherSchema.optional(),
});

export type EmbedConfigThemeSchemaType = z.infer<typeof EmbedConfigThemeSchema>;

/**
 * The zod schema for `EmbedConfigSchemaType`
 */
export const EmbedConfigSchema = z.object({
  /**
   * The theme of the embed. currently support `light` and `dark`.
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
  logIndex: z.number().int().nullable(),
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

const IndexerAPICommentWithRepliesSchema = IndexerAPICommentSchema.extend({
  replies: z.object({
    results: z.array(IndexerAPICommentSchema),
    pagination: IndexerAPIPaginationSchema,
  }),
});

export type IndexerAPICommentWithRepliesSchemaType = z.infer<
  typeof IndexerAPICommentWithRepliesSchema
>;

export const IndexerAPIListCommentsSchema = z.object({
  results: z.array(IndexerAPICommentWithRepliesSchema),
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

export const EmbedResizedEventSchema = z.object({
  type: z.literal("@ecp.eth/sdk/embed/resize"),
  height: z.number().min(0).int(),
});

export type EmbedResizedEventSchemaType = z.infer<
  typeof EmbedResizedEventSchema
>;

export const EmbedGetDimensionsEventSchema = z.object({
  type: z.literal("@ecp.eth/sdk/embed/get-dimensions"),
});

export type EmbedGetDimensionsEventSchemaType = z.infer<
  typeof EmbedGetDimensionsEventSchema
>;

export const DeleteCommentTypedDataSchema = z.object({
  primaryType: z.literal("DeleteComment"),
  domain: z.object({
    name: z.literal(DOMAIN_NAME),
    version: z.literal(DOMAIN_VERSION),
    chainId: z.number(),
    verifyingContract: z.literal(COMMENTS_V1_ADDRESS),
  }),
  message: z.object({
    commentId: HexSchema,
    appSigner: HexSchema,
    author: HexSchema,
    deadline: z.coerce.bigint(),
    nonce: z.coerce.bigint(),
  }),
  types: z.object({
    DeleteComment: z.array(
      z.union([
        z.object({ name: z.literal("commentId"), type: z.literal("bytes32") }),
        z.object({ name: z.literal("author"), type: z.literal("address") }),
        z.object({ name: z.literal("appSigner"), type: z.literal("address") }),
        z.object({ name: z.literal("nonce"), type: z.literal("uint256") }),
        z.object({ name: z.literal("deadline"), type: z.literal("uint256") }),
      ])
    ),
  }),
});

export type DeleteCommentTypedDataSchemaType = z.infer<
  typeof DeleteCommentTypedDataSchema
>;

export const AddCommentTypedDataSchema = z.object({
  primaryType: z.literal("AddComment"),
  domain: z.object({
    name: z.literal(DOMAIN_NAME),
    version: z.literal(DOMAIN_VERSION),
    chainId: z.number(),
    verifyingContract: z.literal(COMMENTS_V1_ADDRESS),
  }),
  message: CommentDataSchema,
  types: z.object({
    AddComment: z.array(
      z.union([
        z.object({ name: z.literal("content"), type: z.literal("string") }),
        z.object({ name: z.literal("metadata"), type: z.literal("string") }),
        z.object({ name: z.literal("targetUri"), type: z.literal("string") }),
        z.object({ name: z.literal("parentId"), type: z.literal("bytes32") }),
        z.object({ name: z.literal("author"), type: z.literal("address") }),
        z.object({ name: z.literal("appSigner"), type: z.literal("address") }),
        z.object({ name: z.literal("salt"), type: z.literal("bytes32") }),
        z.object({ name: z.literal("deadline"), type: z.literal("uint256") }),
      ])
    ),
  }),
});

export type AddCommentTypedDataSchemaType = z.infer<
  typeof AddCommentTypedDataSchema
>;

export const AddApprovalTypedDataSchema = z.object({
  primaryType: z.literal("AddApproval"),
  domain: z.object({
    name: z.literal(DOMAIN_NAME),
    version: z.literal(DOMAIN_VERSION),
    chainId: z.number(),
    verifyingContract: z.literal(COMMENTS_V1_ADDRESS),
  }),
  message: z.object({
    author: HexSchema,
    appSigner: HexSchema,
    nonce: z.coerce.bigint(),
    deadline: z.coerce.bigint(),
  }),
  types: z.object({
    AddApproval: z.array(
      z.union([
        z.object({ name: z.literal("author"), type: z.literal("address") }),
        z.object({ name: z.literal("appSigner"), type: z.literal("address") }),
        z.object({ name: z.literal("nonce"), type: z.literal("uint256") }),
        z.object({ name: z.literal("deadline"), type: z.literal("uint256") }),
      ])
    ),
  }),
});

export type AddApprovalTypedDataSchemaType = z.infer<
  typeof AddApprovalTypedDataSchema
>;
