import { useEffect, useRef } from "react";
import { EditorTheme } from "../editor.type";

/**
 * Hook that injects stylesheet text into the document head as an inline style element.
 * Updates the stylesheet when the text changes and cleans up on unmount.
 *
 * @param styleSheetText - The CSS text to inject, or undefined to remove the stylesheet
 */
export function useThemeStylesheetText(theme?: EditorTheme): void {
  const styleSheetText = theme?.styleSheetText;
  const styleElementRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    // Remove existing style element if text is undefined or empty
    if (!styleSheetText) {
      if (styleElementRef.current) {
        styleElementRef.current.remove();
        styleElementRef.current = null;
      }
      return;
    }

    // Create or update the style element
    if (!styleElementRef.current) {
      const styleElement = document.createElement("style");
      styleElement.setAttribute("data-theme-stylesheet", "");
      document.head.appendChild(styleElement);
      styleElementRef.current = styleElement;
    }

    // Update the stylesheet text
    styleElementRef.current.textContent = styleSheetText;

    // Cleanup function
    return () => {
      if (styleElementRef.current) {
        styleElementRef.current.remove();
        styleElementRef.current = null;
      }
    };
  }, [styleSheetText]);
}
