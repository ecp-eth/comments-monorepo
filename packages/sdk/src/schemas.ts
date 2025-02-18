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
