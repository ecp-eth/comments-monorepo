import { useAnalyticsKpiDeliveriesQuery } from "@/queries/analytics";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { ErrorScreen } from "../error-screen";
import { Button } from "../ui/button";
import { RotateCwIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAnalyticsContext } from "./analytics-provider";

type DeliveriesKpiCardProps = {
  appId?: string;
};

export function DeliveriesKpiCard({ appId }: DeliveriesKpiCardProps) {
  const { params } = useAnalyticsContext();
  const analyticsKpiDeliveriesQuery = useAnalyticsKpiDeliveriesQuery({
    params: {
      from: params.from,
      to: params.to,
      appId,
    },
  });

  if (analyticsKpiDeliveriesQuery.status === "pending") {
    return <Skeleton className="w-full h-full rounded-xl" />;
  }

  if (analyticsKpiDeliveriesQuery.status === "error") {
    console.error(analyticsKpiDeliveriesQuery.error);
    return (
      <Card>
        <ErrorScreen
          title="Error fetching analytics"
          description="Please try again later. If the problem persists, please contact support."
          actions={
            <Button
              className="gap-2"
              disabled={analyticsKpiDeliveriesQuery.isRefetching}
              onClick={() => analyticsKpiDeliveriesQuery.refetch()}
            >
              <RotateCwIcon
                className={cn(
                  "h-4 w-4",
                  analyticsKpiDeliveriesQuery.isRefetching && "animate-spin",
                )}
              />{" "}
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
        <CardDescription>Deliveries</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums">
          {new Intl.NumberFormat(undefined, {
            style: "decimal",
          }).format(analyticsKpiDeliveriesQuery.data.deliveries)}
        </CardTitle>
      </CardHeader>
      <CardFooter className="text-sm">
        <div className="text-muted-foreground">
          Total webhook deliveries in the {params.label}
        </div>
      </CardFooter>
    </Card>
  );
}
