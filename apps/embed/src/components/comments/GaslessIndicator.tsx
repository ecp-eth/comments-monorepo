import { Tooltip, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import {
  TooltipArrow,
  TooltipContent,
  TooltipPortal,
} from "@radix-ui/react-tooltip";
import { useEffect, useCallback, useRef, useState } from "react";

/**
 * @description This component is used to display a gasless tooltip on the wrapped element.
 * @returns
 */
export function GaslessIndicator({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const handleGlobalTouchStart = useCallback((e: TouchEvent) => {
    // Close only on outside touch
    if (
      ref.current &&
      e.target instanceof Node &&
      ref.current.contains(e.target)
    ) {
      return;
    }
    setOpen(false);
  }, []);

  useEffect(() => {
    document.addEventListener("touchstart", handleGlobalTouchStart, {
      passive: true,
    });
    return () => {
      document.removeEventListener("touchstart", handleGlobalTouchStart);
    };
  }, [handleGlobalTouchStart, open]);

  return (
    <div
      ref={ref}
      className="flex items-center cursor-pointer"
      aria-label="Gas fee sponsored"
    >
      <TooltipProvider>
        <Tooltip open={open}>
          <TooltipTrigger
            asChild
            onPointerEnter={(e) => {
              if (e.pointerType !== "mouse") {
                return;
              }
              setOpen(true);
            }}
            onPointerLeave={(e) => {
              if (e.pointerType !== "mouse") {
                return;
              }
              setOpen(false);
            }}
          >
            {children}
          </TooltipTrigger>

          <TooltipPortal>
            <TooltipContent side="bottom" sideOffset={5}>
              <TooltipArrow className="fill-foreground" />
              <div className="text-xs bg-foreground text-background px-2 py-1 rounded-lg max-w-[200px]">
                Gas fees on us — we cover all costs for your post 🫶
              </div>
            </TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
