import { useFreshRef } from "@ecp.eth/shared/hooks";
import { useEffect, useRef } from "react";

type VisibilityTrackerProps = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onVisibilityChange: (isVisible: boolean) => void;
};

export function VisibilityTracker({
  containerRef,
  onVisibilityChange,
}: VisibilityTrackerProps) {
  const onVisibilityChangeRef = useFreshRef(onVisibilityChange);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            onVisibilityChangeRef.current(entry.isIntersecting);
          });
        },
        {
          root: containerRef.current,
          threshold: 0.1,
        },
      );

      observer.observe(ref.current);
    }
  }, [containerRef, onVisibilityChangeRef]);

  return <div ref={ref}></div>;
}
