import { useAnalyticsKpiBacklogQuery } from "@/queries/analytics";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { ErrorScreen } from "../error-screen";
import { Skeleton } from "../ui/skeleton";
import { Button } from "../ui/button";
import { RotateCwIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Fragment } from "react";

export function BacklogSizeKpiCard() {
  const analyticsKpiBacklogQuery = useAnalyticsKpiBacklogQuery();

  if (analyticsKpiBacklogQuery.status === "pending") {
    return <Skeleton className="w-full h-full" />;
  }

  if (analyticsKpiBacklogQuery.status === "error") {
    return (
      <Card>
        <ErrorScreen
          title="Error fetching backlog size KPI"
          description="Please try again later. If the problem persists, please contact support."
          actions={
            <Button
              disabled={analyticsKpiBacklogQuery.isRefetching}
              onClick={() => analyticsKpiBacklogQuery.refetch()}
              className="gap-2"
            >
              <RotateCwIcon
                className={cn(
                  "h-4 w-4",
                  analyticsKpiBacklogQuery.isRefetching && "animate-spin",
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
        <CardDescription>Backlog size</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums flex items-center gap-2">
          {analyticsKpiBacklogQuery.data.inProgress}
        </CardTitle>
      </CardHeader>
      <CardFooter className="text-sm">
        <div className="text-muted-foreground">
          {[
            analyticsKpiBacklogQuery.data.oldestAgeSec != null && (
              <Fragment key="oldest-age">
                Oldest:{" "}
                {new Intl.NumberFormat(undefined, {
                  unit: "second",
                  style: "unit",
                }).format(analyticsKpiBacklogQuery.data.oldestAgeSec)}{" "}
                minutes,{" "}
              </Fragment>
            ),
            analyticsKpiBacklogQuery.data.nextDueAt != null && (
              <Fragment key="next-due-at">
                Next due at:{" "}
                {analyticsKpiBacklogQuery.data.nextDueAt
                  ? new Intl.DateTimeFormat(undefined, {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(analyticsKpiBacklogQuery.data.nextDueAt)
                  : "N/A"}
              </Fragment>
            ),
          ]
            .filter(Boolean)
            .join(", ")}
        </div>
      </CardFooter>
    </Card>
  );
}
