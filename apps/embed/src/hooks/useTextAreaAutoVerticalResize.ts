import { useEffect } from "react";

export function useTextAreaAutoVerticalResize<
  T extends HTMLTextAreaElement | null,
>(textAreaRef: React.RefObject<T>) {
  useEffect(() => {
    const textArea = textAreaRef?.current;

    if (!textArea) {
      return;
    }

    const handleInput = () => {
      textArea.style.height = `${textArea.scrollHeight}px`;
    };

    handleInput();

    textArea.addEventListener("input", handleInput);
    return () => textArea.removeEventListener("input", handleInput);
  }, [textAreaRef]);
}
