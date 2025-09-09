import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart";
import { useAnalyticsVolumeQuery } from "@/queries/analytics";
import { ErrorScreen } from "../error-screen";
import { Skeleton } from "../ui/skeleton";
import { Button } from "../ui/button";
import { RotateCwIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const chartConfig = {
  success: {
    label: "Successes",
    color: "var(--chart-success)",
  },
  failure: {
    label: "Failures",
    color: "var(--chart-failure)",
  },
};

export function AttemptsOverTimeChartCard() {
  const volumeQuery = useAnalyticsVolumeQuery();

  if (volumeQuery.status === "pending") {
    return <Skeleton className="h-full w-full rounded-xl" />;
  }

  if (volumeQuery.status === "error") {
    console.error(volumeQuery.error);
    return (
      <Card className="flex">
        <ErrorScreen
          title="Error fetching volume"
          description="Please try again later. If the problem persists, please contact support."
          actions={
            <Button
              onClick={() => volumeQuery.refetch()}
              className="gap-2"
              disabled={volumeQuery.isRefetching}
            >
              <RotateCwIcon
                className={cn(
                  "h-4 w-4",
                  volumeQuery.isRefetching && "animate-spin",
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
        <CardTitle>Attempts over time</CardTitle>
        <CardDescription>
          Showing attemts over time in the last 7 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart data={volumeQuery.data.results}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value: Date) => {
                if (volumeQuery.data.info.bucket === "hour") {
                  return new Intl.DateTimeFormat(undefined, {
                    hour: "numeric",
                    minute: "numeric",
                  }).format(value);
                }

                return new Intl.DateTimeFormat(undefined, {
                  day: "numeric",
                  month: "short",
                }).format(value);
              }}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" hideLabel />}
            />
            <defs>
              <linearGradient id="fillSuccesses" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-success)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-success)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillFailures" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-failure)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-failure)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <Area
              dataKey="successes"
              type="natural"
              fill="url(#fillSuccesses)"
              fillOpacity={0.4}
              stroke="var(--color-success)"
              stackId="a"
            />
            <Area
              dataKey="failures"
              type="natural"
              fill="url(#fillFailures)"
              fillOpacity={0.4}
              stroke="var(--color-failure)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
