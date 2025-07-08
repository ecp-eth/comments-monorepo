import { PendingWalletConnectionActionsProvider } from "./PendingWalletConnectionActionsContext";

export function CommentSectionWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PendingWalletConnectionActionsProvider>
      <div className="w-full flex flex-col gap-4">{children}</div>
    </PendingWalletConnectionActionsProvider>
  );
}
