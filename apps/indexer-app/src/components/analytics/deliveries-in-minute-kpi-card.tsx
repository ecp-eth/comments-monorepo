import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";

export function DeliveriesInMinuteKpiCard() {
  return (
    <Card>
      <CardHeader>
        <CardDescription>% Delivered ≤60s</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums flex items-center gap-2">
          100%
        </CardTitle>
      </CardHeader>
      <CardFooter className="text-sm">
        <div className="text-muted-foreground">
          Percentage of deliveries delivered within 60 seconds in the last 7
          days
        </div>
      </CardFooter>
    </Card>
  );
}
