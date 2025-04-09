export function CommentSectionWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="w-full flex flex-col gap-4">{children}</div>;
}
