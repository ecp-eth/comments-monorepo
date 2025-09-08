import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";

export function BacklogSizeKpiCard() {
  return (
    <Card>
      <CardHeader>
        <CardDescription>Backlog size</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums flex items-center gap-2">
          0
        </CardTitle>
      </CardHeader>
      <CardFooter className="text-sm">
        <div className="text-muted-foreground">
          Oldest: 12minutes, Next due at: 12:00
        </div>
      </CardFooter>
    </Card>
  );
}
