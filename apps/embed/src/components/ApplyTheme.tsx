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
  const themeRootCSSClasses: string[] = useMemo(() => {
    return ["theme-root", config?.theme?.mode, "bg-background"].filter(
      (item): item is string => Boolean(item),
    );
  }, [config]);
  const themeRootStyle = useMemo(() => {
    return `:root ${styleToCss(createThemeCSSVariables(config))}`;
  }, [config]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    document.documentElement.classList.add(...themeRootCSSClasses);

    return () => {
      document.documentElement.classList.remove(...themeRootCSSClasses);
    };
  }, [themeRootCSSClasses]);

  if (hydrated && "document" in globalThis && globalThis.document) {
    // when it is hydrated, let's portal the style to the head
    // there are 3rd party components such as radix ui relies on global styles to work
    return (
      <>
        {createPortal(
          <>
            <LinkGoogleFont config={config} />
            <style type="text/css">{themeRootStyle}</style>
          </>,
          document.head,
        )}
        {children}
      </>
    );
  }

  return <>{children}</>;
}
