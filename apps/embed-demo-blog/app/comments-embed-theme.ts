import type { EmbedConfigThemeSchemaType } from "@ecp.eth/sdk/embed/schemas";

export const commentsEmbedTheme: EmbedConfigThemeSchemaType = {
  colors: {
    light: {
      background: "#fff",
      foreground: "#000",
    },
    dark: {
      background: "#000",
      foreground: "#fff",
    },
  },
  font: {
    fontFamily: {
      system:
        'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
    },
  },
};
