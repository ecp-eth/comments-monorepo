import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md bg-transparent text-foreground px-3 py-1 text-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
          "transition-[border-color] border border-border focus-visible:outline-none focus-visible:border-border-focus",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
