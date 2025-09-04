import { useCallback, useEffect, useRef, useState } from "react";

type UseCopyToClipboardOptions = {
  /**
   * The delay in milliseconds to set the status to idle.
   *
   * @default 2000
   */
  delay?: number;
};

export function useCopyToClipboard({
  delay = 2000,
}: UseCopyToClipboardOptions = {}) {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const copyToClipboard = useCallback((text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setStatus("success");
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (status === "success") {
      timeoutRef.current = setTimeout(() => setStatus("idle"), delay);
    }
  }, [status, delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [delay]);

  return { isCopied: status, copyToClipboard };
}
