import { createThemeCSSVariables } from "@/lib/theming";
import { cn } from "@/lib/utils";
import type { EmbedConfigSchemaOutputType } from "@ecp.eth/sdk/embed/schemas";
import { useEmbedConfig } from "./EmbedConfigProvider";

function LinkGoogleFont({ config }: { config: EmbedConfigSchemaOutputType }) {
  const fontFamily = config?.theme?.font?.fontFamily;

  if (!fontFamily || !("google" in fontFamily) || !fontFamily.google) {
    return null;
  }

  const googleFontsUrl = new URL("https://fonts.googleapis.com/css2");

  googleFontsUrl.searchParams.set(
    "family",
    fontFamily.google.replace("_", " ")
  );
  googleFontsUrl.searchParams.set("display", "swap");

  return <link href={googleFontsUrl.toString()} rel="stylesheet" />;
}

type ApplyThemeProps = {
  children: React.ReactNode;
};

export function ApplyTheme({ children }: ApplyThemeProps) {
  const config = useEmbedConfig();

  return (
    <>
      <LinkGoogleFont config={config} />
      <div
        className={cn("theme-root", config?.theme?.mode, "bg-background")}
        style={createThemeCSSVariables(config)}
      >
        {children}
      </div>
    </>
  );
}
