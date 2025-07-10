import {
  ReportCommentDialogProvider,
  ReportCommentDialogRenderer,
} from "./ReportCommentDialogProvider";

export function CommentSectionWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ReportCommentDialogProvider>
      <div className="w-full flex flex-col gap-4">{children}</div>
      <ReportCommentDialogRenderer />
    </ReportCommentDialogProvider>
  );
}
