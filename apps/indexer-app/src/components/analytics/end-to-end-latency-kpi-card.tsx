import { RotateCwIcon } from "lucide-react";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { ErrorScreen } from "../error-screen";
import { useAnalyticsKpiE2ELatencyQuery } from "@/queries/analytics";
import { Skeleton } from "../ui/skeleton";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

export function EndToEndLatencyKpiCard() {
  const analyticsKpiE2ELatencyQuery = useAnalyticsKpiE2ELatencyQuery();

  if (analyticsKpiE2ELatencyQuery.status === "pending") {
    return <Skeleton className="w-full h-full" />;
  }

  if (analyticsKpiE2ELatencyQuery.status === "error") {
    return (
      <Card>
        <ErrorScreen
          title="Error fetching e2e latency KPI"
          description="Please try again later. If the problem persists, please contact support."
          actions={
            <Button
              disabled={analyticsKpiE2ELatencyQuery.isRefetching}
              onClick={() => analyticsKpiE2ELatencyQuery.refetch()}
              className="gap-2"
            >
              <RotateCwIcon
                className={cn(
                  "h-4 w-4",
                  analyticsKpiE2ELatencyQuery.isRefetching && "animate-spin",
                )}
              />
              Retry
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardDescription>End to end latency (p95)</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums flex items-center gap-2">
          {new Intl.NumberFormat(undefined, {
            unit: "millisecond",
            style: "unit",
          }).format(analyticsKpiE2ELatencyQuery.data.p95)}
        </CardTitle>
      </CardHeader>
      <CardFooter className="text-sm">
        <div className="text-muted-foreground">
          End to end latency in the last 7 days
        </div>
      </CardFooter>
    </Card>
  );
}
