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
import { useAnalyticsContext } from "./analytics-provider";

export function EndToEndLatencyKpiCard() {
  const { params } = useAnalyticsContext();
  const analyticsKpiE2ELatencyQuery = useAnalyticsKpiE2ELatencyQuery({
    params: {
      from: params.from,
      to: params.to,
    },
  });

  if (analyticsKpiE2ELatencyQuery.status === "pending") {
    return <Skeleton className="w-full h-full rounded-xl" />;
  }

  if (analyticsKpiE2ELatencyQuery.status === "error") {
    console.error(analyticsKpiE2ELatencyQuery.error);
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

  let value = "0 ms";

  if ("DurationFormat" in Intl) {
    const valueMs = analyticsKpiE2ELatencyQuery.data.p95;
    const hours = Math.floor(valueMs / 3_600_000);
    const minutes = Math.floor((valueMs % 3_600_000) / 60_000);
    const seconds = Math.floor((valueMs % 60_000) / 1000);
    const milliseconds = Math.round(valueMs % 1000);

    // @ts-expect-error - DurationFormat is not supported in all browsers
    value = new Intl.DurationFormat(undefined, {
      style: "short",
    }).format({
      hours,
      minutes,
      seconds,
      milliseconds,
    });
  } else {
    value = new Intl.NumberFormat(undefined, {
      unit: "millisecond",
      style: "unit",
    }).format(analyticsKpiE2ELatencyQuery.data.p95);
  }

  return (
    <Card>
      <CardHeader>
        <CardDescription>End to end latency (p95)</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums flex items-center gap-2">
          {value}
        </CardTitle>
      </CardHeader>
      <CardFooter className="text-sm">
        <div className="text-muted-foreground">
          End to end latency in the {params.label}
        </div>
      </CardFooter>
    </Card>
  );
}
