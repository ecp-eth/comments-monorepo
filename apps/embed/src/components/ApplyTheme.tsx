import { createThemeCSSVariables } from "@/lib/theming";
import { cn } from "@/lib/utils";
import { EmbedConfigSchemaType } from "@ecp.eth/sdk/schemas";

function LinkGoogleFont({ config }: { config?: EmbedConfigSchemaType }) {
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
  config: EmbedConfigSchemaType | undefined;
  children: React.ReactNode;
};

export function ApplyTheme({ config, children }: ApplyThemeProps) {
  return (
    <>
      <LinkGoogleFont config={config} />
      <div
        className={cn("theme-root", config?.theme?.mode)}
        style={createThemeCSSVariables(config)}
      >
        {children}
      </div>
    </>
  );
}
