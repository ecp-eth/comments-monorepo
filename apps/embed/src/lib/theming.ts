import type {
  EmbedConfigThemeSchemaType,
  EmbedConfigThemePaletteSchemaType,
} from "@ecp.eth/sdk/schemas";

export function createThemeCSSVariables(
  theme: EmbedConfigThemeSchemaType | undefined
): string {
  if (!theme) {
    return "";
  }

  const { colors } = theme;

  let lightTheme = "";
  let darkTheme = "";

  if (colors?.light) {
    lightTheme = createThemeVariables(colors.light);
  }

  if (colors?.dark) {
    darkTheme = createThemeVariables(colors.dark);
  }

  return `
:root {
${lightTheme}
}

@media (prefers-color-scheme: dark) {
  :root:not(.light) {
    ${darkTheme}
  }
}

:root.dark {
  ${darkTheme}
}
`;
}

function createThemeVariables(
  theme: EmbedConfigThemePaletteSchemaType | undefined
) {
  if (!theme) {
    return "";
  }

  let cssVariables = "";

  for (const [key, value] of Object.entries(theme)) {
    cssVariables += `--${key}: ${value};\n`;
  }
  return cssVariables;
}
