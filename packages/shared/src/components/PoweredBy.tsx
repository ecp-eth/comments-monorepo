import Link from "next/link";
import { Logo } from "./Logo.js";
import { cn } from "../helpers.js";

type PoweredByProps = {
  className?: string;
};

export function PoweredBy({ className }: PoweredByProps) {
  return (
    <div className={cn("flex items-center text-sm", className)}>
      <Link
        className="flex flex-row gap-2 opacity-50 hover:opacity-100"
        href="https://docs.ethcomments.xyz"
        target="_blank"
      >
        <Logo className="w-4 h-4" /> Comments powered by ECP
      </Link>
    </div>
  );
}
