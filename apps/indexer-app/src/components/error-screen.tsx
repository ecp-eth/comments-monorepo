import { AlertTriangleIcon } from "lucide-react";
import type { ReactNode } from "react";

type ErrorScreenProps = {
  title: ReactNode;
  description?: ReactNode;
  actions: ReactNode;
};

export function ErrorScreen({ title, description, actions }: ErrorScreenProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <AlertTriangleIcon className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-lg font-semibold mb-2 text-foreground">{title}</h2>
      {description ? (
        <p className="text-muted-foreground mb-4">{description}</p>
      ) : null}

      {actions}
    </div>
  );
}
