type CommentActionButtonProps = {
  onClick: () => void;
  children: React.ReactNode;
};

export function CommentActionButton({
  children,
  onClick,
}: CommentActionButtonProps) {
  return (
    <button
      className="inline-flex items-center justify-center transition-colors text-muted-foreground text-xs rounded-md hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
