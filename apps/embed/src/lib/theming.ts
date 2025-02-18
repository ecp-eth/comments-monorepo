import type { EmbedConfigThemeSchemaType } from "@ecp.eth/sdk/schemas";

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

  return `
:root {
${lightTheme}
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

function createThemeVariables(theme: Record<string, string> | undefined) {
  if (!theme) {
    return "";
  }

  let cssVariables = "";

  for (const [key, value] of Object.entries(theme)) {
    cssVariables += `--${key}: ${value};\n`;
  }
  return cssVariables;
}
