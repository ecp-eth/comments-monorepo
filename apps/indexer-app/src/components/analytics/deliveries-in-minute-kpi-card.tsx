import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { ErrorScreen } from "../error-screen";
import { useAnalyticsKpiDeliveredUnderMinuteQuery } from "@/queries/analytics";
import { Button } from "../ui/button";
import { RotateCwIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAnalyticsContext } from "./analytics-provider";

export function DeliveriesInMinuteKpiCard() {
  const { params } = useAnalyticsContext();
  const analyticsKpiDeliveredUnderMinuteQuery =
    useAnalyticsKpiDeliveredUnderMinuteQuery({
      params: {
        from: params.from,
        to: params.to,
      },
    });

  if (analyticsKpiDeliveredUnderMinuteQuery.status === "pending") {
    return <Skeleton className="w-full h-full rounded-xl" />;
  }

  if (analyticsKpiDeliveredUnderMinuteQuery.status === "error") {
    console.error(analyticsKpiDeliveredUnderMinuteQuery.error);
    return (
      <Card>
        <ErrorScreen
          title="Error fetching deliveries in minute KPI"
          description="Please try again later. If the problem persists, please contact support."
          actions={
            <Button
              disabled={analyticsKpiDeliveredUnderMinuteQuery.isRefetching}
              onClick={() => analyticsKpiDeliveredUnderMinuteQuery.refetch()}
              className="gap-2"
            >
              <RotateCwIcon
                className={cn(
                  "h-4 w-4",
                  analyticsKpiDeliveredUnderMinuteQuery.isRefetching &&
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
        <CardDescription>% Delivered ≤60s</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums flex items-center gap-2">
          {new Intl.NumberFormat(undefined, {
            style: "percent",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(analyticsKpiDeliveredUnderMinuteQuery.data.rate)}
        </CardTitle>
      </CardHeader>
      <CardFooter className="text-sm">
        <div className="text-muted-foreground">
          Percentage of deliveries delivered within 60 seconds in the{" "}
          {params.label}
        </div>
      </CardFooter>
    </Card>
  );
}
