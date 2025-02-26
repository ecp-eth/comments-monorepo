import { EmbedConfigSchemaType } from "@ecp.eth/sdk/schemas";

export const commentsEmbedTheme: EmbedConfigSchemaType = {
  theme: {
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
  },
};
