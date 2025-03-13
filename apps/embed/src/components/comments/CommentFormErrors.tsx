import { CommentFormSubmitError } from "./errors";

export function CommentFormErrors({
  error,
}: {
  error: Error | CommentFormSubmitError;
}) {
  return (
    <div className="text-xs text-destructive flex flex-col gap-1">
      {error instanceof CommentFormSubmitError ? error.render() : error.message}
    </div>
  );
}
