import { cn } from "../helpers";
import { CommentFormSubmitError } from "../errors";

type CommentFormErrorsProps = {
  error: Error | CommentFormSubmitError;
  className?: string;
};

export function CommentFormErrors({
  error,
  className,
}: CommentFormErrorsProps) {
  return (
    <div className={cn("text-xs text-red-500 flex flex-col gap-1", className)}>
      {error instanceof CommentFormSubmitError ? error.render() : error.message}
    </div>
  );
}
