import type {
  EmbedConfigThemeSchemaType,
  EmbedConfigFontSchemaType,
} from "@ecp.eth/sdk/schemas";

export function createThemeCSSVariables(
  theme: EmbedConfigThemeSchemaType | undefined
): string {
  if (!theme) {
    return "";
  }

  const { colors } = theme;

  const lightTheme = createThemeVariables(colors?.light);
  const darkTheme = createThemeVariables(colors?.dark);
  const otherVariables = createThemeVariables(theme.other);
  const font = createFontThemeVariables(theme.font);

  return `
:root {
${lightTheme}
${font}
${otherVariables}
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
  theme: Record<string, string> | undefined
): string {
  if (!theme) {
    return "";
  }

  let cssVariables = "";

  for (const [key, value] of Object.entries(theme)) {
    cssVariables += `--${key}: ${value};\n`;
  }
  return cssVariables;
}

function createFontThemeVariables(
  font: EmbedConfigFontSchemaType | undefined
): string {
  if (!font) {
    return "";
  }

  let cssVariables = "";

  if (font.sizes) {
    for (const [key, value] of Object.entries(font.sizes)) {
      if (value.size) {
        cssVariables += `--font-size-${key}: ${value.size};\n`;
      }

      if (value.lineHeight) {
        cssVariables += `--line-height-${key}: ${value.lineHeight};\n`;
      }
    }
  }

  return cssVariables;
}
