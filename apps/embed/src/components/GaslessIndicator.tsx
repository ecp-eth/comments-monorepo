import { Sparkles } from "lucide-react";

export function GaslessIndicator() {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-accent border border-border px-3 py-2 mb-4">
      <Sparkles className="h-4 w-4 text-accent-foreground" />
      <span className="text-sm font-medium text-accent-foreground">
        Transactions sponsored — post for free!
      </span>
    </div>
  );
}
