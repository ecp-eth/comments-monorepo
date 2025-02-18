import { AlertOctagon } from "lucide-react";
import { Button } from "./ui/button";

interface ErrorScreenProps {
  description?: string;
  extra?: React.ReactNode;
  onRetry?: () => void;
}

export function ErrorScreen({
  description = "Something went wrong",
  extra,
  onRetry,
}: ErrorScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertOctagon className="w-12 h-12 text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2 text-foreground">Ooops!</h2>
      <p className="text-muted-foreground mb-4">{description}</p>
      {extra}
      {onRetry && (
        <Button onClick={onRetry} variant="secondary">
          Try again
        </Button>
      )}
    </div>
  );
}
