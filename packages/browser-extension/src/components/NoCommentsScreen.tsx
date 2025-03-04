import { MessageCircleDashedIcon } from "lucide-react";
import { Button } from "./ui/button";

interface NoCommentsScreenProps {
  description?: string;
  /**
   * Title of the screen
   *
   * @default "No comments"
   */
  title?: string;
  extra?: React.ReactNode;
  onRefresh?: () => void;
}

export function NoCommentsScreen({
  description,
  extra,
  onRefresh,
  title = "No comments",
}: NoCommentsScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <MessageCircleDashedIcon className="w-12 h-12 text-muted-foreground mb-4" />
      <h2 className="text-empty-screen-title font-semibold mb-2 text-foreground">
        {title}
      </h2>
      <p className="text-muted-foreground mb-4">{description}</p>
      {extra}
      {onRefresh && (
        <Button onClick={onRefresh} variant="secondary">
          Reload
        </Button>
      )}
    </div>
  );
}
