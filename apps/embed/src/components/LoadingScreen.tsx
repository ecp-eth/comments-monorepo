import { Loader2 } from "lucide-react";

export function LoadingScreen() {
  return (
    <div className="flex justify-center items-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
    </div>
  );
}
