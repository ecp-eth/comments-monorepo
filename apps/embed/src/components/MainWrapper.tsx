import { cn } from "@ecp.eth/shared/helpers";

/**
 * This component shares the stying of the wrapper of 3 different pages:
 * - /
 * - /by-author
 * - /by-replies
 *
 * The idea having the component is to avoid code duplication which may introduce inconsistencies overtime.
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
