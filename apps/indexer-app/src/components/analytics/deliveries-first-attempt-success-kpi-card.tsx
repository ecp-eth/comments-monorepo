import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";

export function DeliveriesFirstAttemptSuccessKpiCard() {
  return (
    <Card>
      <CardHeader>
        <CardDescription>First attempt success %</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums flex items-center gap-2">
          <TrendingUpIcon />
          0%
        </CardTitle>
      </CardHeader>
      <CardFooter className="text-sm">
        <div className="text-muted-foreground">
          First attempt delivery success rate in the last 7 days
        </div>
      </CardFooter>
    </Card>
  );
}
