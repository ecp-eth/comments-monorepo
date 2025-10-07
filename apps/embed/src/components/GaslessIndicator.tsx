import { Zap } from "lucide-react";
import { Tooltip, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import {
  TooltipArrow,
  TooltipContent,
  TooltipPortal,
} from "@radix-ui/react-tooltip";
import { useRef } from "react";

export function GaslessIndicator({
  children = <Zap className="h-3 w-3 fill-background stroke-lime-400" />,
}: {
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      className="flex items-center cursor-pointer"
      aria-label="Gas fee sponsored"
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{children}</TooltipTrigger>

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
