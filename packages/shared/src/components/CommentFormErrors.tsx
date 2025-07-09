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
      {isCommentFormSubmitError(error) ? error.render() : error.message}
    </div>
  );
}

/**
 * Check if an error is typeof CommentFormSubmitError,
 * Use duck typing to avoid CommentFormSubmitError reference issue introduced by bundling
 */
function isCommentFormSubmitError(
  error: Error,
): error is CommentFormSubmitError {
  return (
    error instanceof CommentFormSubmitError ||
    ("render" in error && typeof error.render === "function")
  );
}
