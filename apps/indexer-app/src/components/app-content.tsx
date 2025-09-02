import { cn } from "@/lib/utils";

export function AppContent({
  children,
  className,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("flex  flex-1 p-4", className)}>{children}</div>;
}
