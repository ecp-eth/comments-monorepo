import { Info } from "lucide-react";

export default function LabelWithHelp({
  label,
  help,
  htmlFor,
}: {
  htmlFor: string;
  label: string;
  help: string;
}) {
  return (
    <div className="flex items-center gap-1" title={help}>
      <label className="text-sm font-medium" htmlFor={htmlFor}>
        {label}
      </label>
      <Info className="w-3 h-3 text-muted-foreground" />
    </div>
  );
}
