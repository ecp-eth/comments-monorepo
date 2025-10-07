import { Zap } from "lucide-react";
import { Tooltip, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import {
  TooltipArrow,
  TooltipContent,
  TooltipPortal,
} from "@radix-ui/react-tooltip";
import { useEffect, useCallback, useRef, useState } from "react";

export function GaslessIndicator({
  children = <Zap className="h-3 w-3 fill-background stroke-lime-400" />,
  enableTooltipOnClick = false,
}: {
  /**
   * You may want to enable this on mobile for certain cases
   */
  enableTooltipOnClick?: boolean;
  children?: React.ReactNode;
}) {
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
            onClick={enableTooltipOnClick ? () => setOpen(!open) : undefined}
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

          <TooltipPortal container={ref.current}>
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
