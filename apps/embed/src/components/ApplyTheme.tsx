"use client";

import { createThemeCSSVariables } from "@/lib/theming";
import type { EmbedConfigSchemaOutputType } from "@ecp.eth/sdk/embed/schemas";
import { useEmbedConfig } from "./EmbedConfigProvider";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import styleToCss from "style-object-to-css-string";

function LinkGoogleFont({ config }: { config: EmbedConfigSchemaOutputType }) {
  const fontFamily = config?.theme?.font?.fontFamily;

  if (!fontFamily || !("google" in fontFamily) || !fontFamily.google) {
    return null;
  }

  const googleFontsUrl = new URL("https://fonts.googleapis.com/css2");

  googleFontsUrl.searchParams.set(
    "family",
    fontFamily.google.replace("_", " "),
  );
  googleFontsUrl.searchParams.set("display", "swap");

  return <link href={googleFontsUrl.toString()} rel="stylesheet" />;
}

type ApplyThemeProps = {
  children: React.ReactNode;
};

export function ApplyTheme({ children }: ApplyThemeProps) {
  const config = useEmbedConfig();
  const themeModeClass = config?.theme?.mode;
  const themeRootStyle = useMemo(() => {
    return `:root { ${styleToCss(createThemeCSSVariables(config))} }`;
  }, [config]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    if (themeModeClass) {
      html.classList.add(themeModeClass);
    }
    return () => {
      if (themeModeClass) {
        html.classList.remove(themeModeClass);
      }
    };
  }, [themeModeClass]);

  const styleTag = <style type="text/css">{themeRootStyle}</style>;

  if (hydrated && "document" in globalThis && globalThis.document) {
    return (
      <>
        {createPortal(
          <>
            <LinkGoogleFont config={config} />
            {styleTag}
          </>,
          document.head,
        )}
        {children}
      </>
    );
  }

  return (
    <>
      {styleTag}
      {children}
    </>
  );
}
