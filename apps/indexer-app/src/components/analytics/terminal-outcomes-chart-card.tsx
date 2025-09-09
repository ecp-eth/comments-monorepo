import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart";
import { useAnalyticsTerminalQuery } from "@/queries/analytics";
import { Skeleton } from "../ui/skeleton";
import { ErrorScreen } from "../error-screen";
import { Button } from "../ui/button";
import { RotateCwIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const chartConfig = {
  success: {
    label: "Successes",
    color: "hsl(var(--chart-2))",
  },
  failure: {
    label: "Failures",
    color: "hsl(var(--chart-3))",
  },
};

export function TerminalOutcomesChartCard() {
  const analyticsTerminalQuery = useAnalyticsTerminalQuery();

  if (analyticsTerminalQuery.status === "pending") {
    return <Skeleton className="w-full h-full rounded-xl" />;
  }

  if (analyticsTerminalQuery.status === "error") {
    console.error(analyticsTerminalQuery.error);
    return (
      <Card className="flex">
        <ErrorScreen
          title="Error fetching terminal outcomes"
          description="Please try again later. If the problem persists, please contact support."
          actions={
            <Button
              className="gap-2"
              disabled={analyticsTerminalQuery.isRefetching}
              onClick={() => analyticsTerminalQuery.refetch()}
            >
              <RotateCwIcon
                className={cn(
                  "h-4 w-4",
                  analyticsTerminalQuery.isRefetching && "animate-spin",
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
        <CardTitle>Terminal outcomes</CardTitle>
        <CardDescription>
          Showing terminal outcomes in the last 7 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart data={analyticsTerminalQuery.data.results}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value: Date) => {
                if (analyticsTerminalQuery.data.info.bucket === "hour") {
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
            <Bar
              dataKey="successes"
              fill="var(--chart-success)"
              fillOpacity={0.4}
              stackId="a"
            />
            <Bar
              dataKey="failures"
              fill="var(--chart-failure)"
              fillOpacity={0.4}
              stackId="a"
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
