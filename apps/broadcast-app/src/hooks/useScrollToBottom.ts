import { useEffect, useRef } from "react";

export function useScrollToBottom(deps: unknown[] = []) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    const scrollToBottom = () => {
      scrollElement.scrollTop = scrollElement.scrollHeight;
    };

    // Scroll to bottom immediately
    scrollToBottom();

    // Also scroll after a short delay to handle dynamic content
    const timeoutId = setTimeout(scrollToBottom, 100);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps); // Re-run when dependencies change

  return scrollRef;
}
