import { z } from "zod";
import { EmbedConfigSupportedFont } from "./fonts.js";
import { DEFAULT_CHAIN_ID, DEFAULT_CHAIN_ID_DEV } from "../../constants.js";
import { HexSchema } from "../../core/schemas.js";

export { EmbedConfigSupportedFont };

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

const CSSPercentageRegexStr = "[0-9]{1,3}(\\.[0-9]{1,2})?%";

const CSSHSLColorSchema = z
  .string()
  .regex(
    new RegExp(
      `^hsla?\\([0-9]{1,3}(deg)?,\\s*${CSSPercentageRegexStr},\\s*${CSSPercentageRegexStr}(,\\s*([0-1]?\\.?[0-9]+|[0-9]{1,3}%))?\\)$`,
    ),
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
  .regex(/^([0-9]*\.[0-9]+|[0-9]+)(px|em|rem|vh|vw|vmin|vmax|%)?$/)
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
  "account-edit-link": CSSColorSchema.optional().describe(
    'Color used by "edit" button in comment form when a wallet is connected',
  ),
  primary: CSSColorSchema.optional().describe('"primary" background color'),
  "primary-foreground": CSSColorSchema.optional().describe(
    'Text on "primary" background',
  ),
  secondary: CSSColorSchema.optional().describe('"secondary" background color'),
  "secondary-foreground": CSSColorSchema.optional().describe(
    'Text on "secondary" background',
  ),
  destructive: CSSColorSchema.optional().describe(
    '"destructive" background color, or text color for error messages',
  ),
  "destructive-foreground": CSSColorSchema.optional().describe(
    'Text on "destructive" background',
  ),
  "muted-foreground": CSSColorSchema.optional().describe('"muted" text'),
  ring: CSSColorSchema.optional().describe(
    "Color used by interactive elements like button when they are focused",
  ),
  border: CSSColorSchema.optional().describe("Border color"),
  "border-focus": CSSColorSchema.optional().describe(
    "Border color when focused",
  ),
  input: CSSColorSchema.optional().describe("Input background color"),
  "input-foreground": CSSColorSchema.optional().describe("Input text color"),
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
  "root-padding-vertical": CSSSizeSchema.optional(),
  "root-padding-horizontal": CSSSizeSchema.optional(),
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
          "Font family available on Google fonts",
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

/**
 * The zod schema for embed theme configuration
 */
export const EmbedConfigThemeSchema = z.object({
  mode: z
    .enum(["light", "dark"])
    .optional()
    .describe(
      'Theme mode, "light" or "dark". Defaults to prefers-color-scheme if omitted.',
    ),
  colors: EmbedConfigThemeColorsSchema.optional(),
  font: EmbedConfigFontSchema.optional(),
  other: EmbedConfigThemeOtherSchema.optional(),
});

/**
 * The type for embed theme configuration
 */
export type EmbedConfigThemeSchemaType = z.infer<typeof EmbedConfigThemeSchema>;

/**
 * The zod schema for supported chain ids
 */
export const EmbedConfigSupportedChainIdsSchema = z
  .union([z.literal(DEFAULT_CHAIN_ID), z.literal(DEFAULT_CHAIN_ID_DEV)])
  .optional()
  .default(__DEV__ ? DEFAULT_CHAIN_ID_DEV : DEFAULT_CHAIN_ID);

/**
 * The type for supported chain ids
 */
export type EmbedConfigSupportedChainIdsSchemaType = z.infer<
  typeof EmbedConfigSupportedChainIdsSchema
>;

/**
 * The zod schema for `EmbedConfigSchemaType`
 */
export const EmbedConfigSchema = z.object({
  /**
   * The theme of the embed. currently support `light` and `dark`.
   */
  theme: EmbedConfigThemeSchema.optional(),
  /**
   * The id of the chain to post the comments to.
   * We don't filter chain id when fetching comments.
   *
   * default to {@link DEFAULT_CHAIN_ID}
   */
  chainId: EmbedConfigSupportedChainIdsSchema,
  /**
   * Hide powered by ECP link
   *
   * @default false
   */
  disablePromotion: z.boolean().default(false),
  /**
   * Restrict the maximum container width
   *
   * @default true
   */
  restrictMaximumContainerWidth: z.boolean().default(true),
  /**
   * Specify the app signer address the comments associated with.
   *
   * - Set it to "embed" will cause the embed to retrieve all comments posted by the embed app.
   * - Set it to "all" will cause the embed to retrieve all comments from all apps.
   * - Set it to a valid hex address will cause the embed to retrieve all comments posted by the specified app.
   *
   * @default "embed"
   */
  app: z
    .union([HexSchema, z.literal("embed"), z.literal("all")])
    .default("embed"),

  gasSponsorship: z
    .union([
      // this option is needed for when we want to support custom channel id
      z.literal("gas-not-sponsored"),
      z.literal("gas-sponsored-dual-auth"),
      z.literal("gas-sponsored-auth-everytime"),
      z.literal("gas-sponsored-preauth"),
    ])
    .default("gas-not-sponsored"),
});

/**
 * Custom configuration for `<CommentEmbed />` component.
 */
export type EmbedConfigSchemaInputType = z.input<typeof EmbedConfigSchema>;
export type EmbedConfigSchemaOutputType = z.output<typeof EmbedConfigSchema>;

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
