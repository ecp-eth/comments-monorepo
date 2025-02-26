import type { EmbedConfigSchemaType } from "@ecp.eth/sdk/schemas";
import { CSSProperties } from "react";

export const defaultTheme: EmbedConfigSchemaType = {
  theme: {
    colors: {
      light: {
        "destructive-foreground": "hsl(0 0% 98%)",
        "muted-foreground": "hsl(0 0% 45.1%)",
        "primary-foreground": "hsl(0 0% 98%)",
        "secondary-foreground": "hsl(0 0% 9%)",
        background: "white",
        border: "hsl(0 0% 89.8%)",
        destructive: "hsl(0 84.2% 60.2%)",
        foreground: "hsl(0 0% 3.9%)",
        primary: "hsl(0 0% 9%)",
        ring: "hsl(0 0% 3.9%)",
        secondary: "hsl(0 0% 96.1%)",
      },
      dark: {
        "destructive-foreground": "hsl(0 0% 98%)",
        "muted-foreground": "hsl(0 0% 63.9%)",
        "primary-foreground": "hsl(0 0% 9%)",
        "secondary-foreground": "hsl(0 0% 98%)",
        background: "hsl(0 0% 3.9%)",
        border: "hsl(0 0% 14.9%)",
        destructive: "hsl(0 84.2% 60.2%)",
        foreground: "hsl(0 0% 98%)",
        primary: "hsl(0 0% 98%)",
        ring: "hsl(0 0% 83.1%)",
        secondary: "hsl(0 0% 14.9%)",
      },
    },
    other: {
      radius: "0.5rem",
    },
  },
};

export function createThemeCSSVariables(
  config: EmbedConfigSchemaType | undefined
): CSSProperties {
  const variables: Record<string, string> = {};

  if (config?.theme?.colors?.light) {
    const lightTheme = config.theme.colors.light;

    for (const [key, value] of Object.entries(lightTheme)) {
      variables[`--light-theme-${key}`] = value;
    }
  }

  if (config?.theme?.colors?.dark) {
    const darkTheme = config.theme.colors.dark;

    for (const [key, value] of Object.entries(darkTheme)) {
      variables[`--dark-theme-${key}`] = value;
    }
  }

  if (config?.theme?.font?.fontFamily) {
    const fontFamily = config.theme.font.fontFamily;

    if ("google" in fontFamily && fontFamily.google) {
      variables["--theme-font-family-default"] = fontFamily.google.replace(
        "_",
        " "
      );
    } else if ("system" in fontFamily && fontFamily.system) {
      variables["--theme-font-family-default"] = fontFamily.system;
    }
  }

  if (config?.theme?.font?.sizes) {
    for (const [key, value] of Object.entries(config.theme.font.sizes)) {
      if (value.size) {
        variables[`--theme-font-size-${key}`] = value.size;
      }

      if (value.lineHeight) {
        variables[`--theme-line-height-${key}`] = value.lineHeight;
      }
    }
  }

  if (config?.theme?.other) {
    for (const [key, value] of Object.entries(config.theme.other)) {
      variables[`--theme-${key}`] = value;
    }
  }

  return variables;
}
