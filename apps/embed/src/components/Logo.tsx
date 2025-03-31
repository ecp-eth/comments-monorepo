import { cn } from "@/lib/utils";
import * as React from "react";
import { SVGProps } from "react";

export function Logo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={cn("text-foreground", className)}
      xmlns="http://www.w3.org/2000/svg"
      width={2022}
      height={1865}
      viewBox="0 0 2022 1865"
      fill="none"
      {...props}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M2022.01 932.5c0 515.01-417.5 932.5-932.5 932.5-202.805 0-390.486-64.74-543.508-174.68L.893 1727.15l221.391-451.22c-42.125-106.28-65.277-222.15-65.277-343.43C157.007 417.494 574.502 0 1089.51 0c515 0 932.5 417.494 932.5 932.5Zm-546.4-20.293L1089.91 256 704.212 912.207l385.698 240.003 385.7-240.003Zm-385.7 627.713 386.1-550.654-386.1 242.014-386.902-242.014 386.902 550.654Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
