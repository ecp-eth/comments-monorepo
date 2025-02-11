import { AlertOctagon } from "lucide-react";
import { Button } from "./ui/button";

interface ErrorScreenProps {
  description?: string;
  onRetry?: () => void;
}

export function ErrorScreen({
  description = "Something went wrong",
  onRetry,
}: ErrorScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertOctagon className="w-12 h-12 text-red-500 mb-4" />
      <h2 className="text-xl font-semibold mb-2">Ooops!</h2>
      <p className="text-gray-600 mb-4">{description}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="secondary">
          Try again
        </Button>
      )}
    </div>
  );
}
