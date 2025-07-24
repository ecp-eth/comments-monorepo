import { cn } from "@ecp.eth/shared/helpers";

/**
 * This component share the stying of the wrapper of 3 different pages:
 * - /
 * - /by-author
 * - /by-replies
 */
export function MainWrapper({
  children,
  restrictMaximumContainerWidth,
}: {
  children: React.ReactNode;
  restrictMaximumContainerWidth: boolean;
}) {
  return (
    <main className="p-0 text-foreground font-default px-root-padding-horizontal py-root-padding-vertical">
      <div
        className={cn("mx-auto", restrictMaximumContainerWidth && "max-w-4xl")}
      >
        {children}
      </div>
    </main>
  );
}
