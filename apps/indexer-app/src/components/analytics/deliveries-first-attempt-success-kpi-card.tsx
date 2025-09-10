import { RotateCwIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { useAnalyticsKpiFirstAttemptSuccessQuery } from "@/queries/analytics";
import { Skeleton } from "../ui/skeleton";
import { ErrorScreen } from "../error-screen";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { useAnalyticsContext } from "./analytics-provider";

export function DeliveriesFirstAttemptSuccessKpiCard() {
  const { params } = useAnalyticsContext();
  const analyticsKpiFirstAttemptSuccessQuery =
    useAnalyticsKpiFirstAttemptSuccessQuery({
      params: {
        from: params.from,
        to: params.to,
      },
    });

  if (analyticsKpiFirstAttemptSuccessQuery.status === "pending") {
    return <Skeleton className="w-full h-full rounded-xl" />;
  }

  if (analyticsKpiFirstAttemptSuccessQuery.status === "error") {
    console.error(analyticsKpiFirstAttemptSuccessQuery.error);
    return (
      <Card>
        <ErrorScreen
          title="Error fetching first attempt success KPI"
          description="Please try again later. If the problem persists, please contact support."
          actions={
            <Button
              disabled={analyticsKpiFirstAttemptSuccessQuery.isRefetching}
              onClick={() => analyticsKpiFirstAttemptSuccessQuery.refetch()}
              className="gap-2"
            >
              <RotateCwIcon
                className={cn(
                  "h-4 w-4",
                  analyticsKpiFirstAttemptSuccessQuery.isRefetching &&
                    "animate-spin",
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
        <CardDescription>First attempt success %</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums flex items-center gap-2">
          {analyticsKpiFirstAttemptSuccessQuery.data.delta > 0 ? (
            <TrendingUpIcon className="h-4 w-4 text-green-500" />
          ) : null}
          {analyticsKpiFirstAttemptSuccessQuery.data.delta < 0 ? (
            <TrendingDownIcon className="h-4 w-4 text-red-500" />
          ) : null}
          <span>
            {new Intl.NumberFormat(undefined, {
              style: "percent",
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(
              analyticsKpiFirstAttemptSuccessQuery.data.firstSuccessRate,
            )}
          </span>
        </CardTitle>
      </CardHeader>
      <CardFooter className="text-sm">
        <div className="text-muted-foreground">
          First attempt delivery success rate in the {params.label}
        </div>
      </CardFooter>
    </Card>
  );
}
