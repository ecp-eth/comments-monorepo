import { useEffect } from "react";

/**
 * Automatically put a focus to the end of textarea content
 * @param textareaRef
 */
export function useTextAreaAutoFocus<T extends HTMLTextAreaElement | null>(
  textareaRef: React.RefObject<T>,
  enabled: boolean
) {
  useEffect(() => {
    if (!textareaRef.current || !enabled) {
      return;
    }

    const textArea = textareaRef.current;
    textArea.focus();
    textArea.setSelectionRange(textArea.value.length, textArea.value.length);
  }, [enabled, textareaRef]);
}
