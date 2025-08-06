import { cn } from "@/lib/utils";
import React from "react";

interface CommentActionButtonProps {
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export function CommentActionButton({
  className,
  disabled,
  children,
  onClick,
}: CommentActionButtonProps) {
  return (
    <button
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center transition-colors text-muted-foreground text-xs rounded-md hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        className,
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
