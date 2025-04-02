import type { EmbedConfigSchemaOutputType } from "@ecp.eth/sdk/schemas";
import { CSSProperties } from "react";

export function createThemeCSSVariables(
  config: EmbedConfigSchemaOutputType | undefined
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
