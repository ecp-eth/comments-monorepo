import { InfoIcon, type LucideProps } from "lucide-react";
import { cloneElement, type ReactElement, type ReactNode } from "react";

type EmptyScreenProps = {
  icon?: ReactElement<LucideProps>;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
};

export function EmptyScreen({
  icon = <InfoIcon />,
  title,
  description,
  actions,
}: EmptyScreenProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      {cloneElement(icon, {
        className: "h-12 w-12 text-muted-foreground mb-4",
      })}
      <h2 className="text-lg font-semibold mb-2 text-foreground">{title}</h2>
      {description ? (
        <p className="text-muted-foreground mb-4">{description}</p>
      ) : null}
      {actions}
    </div>
  );
}
