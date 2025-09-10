import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "../ui/chart";
import { useAnalyticsErrorsQuery } from "@/queries/analytics";
import { Skeleton } from "../ui/skeleton";
import { ErrorScreen } from "../error-screen";
import { Button } from "../ui/button";
import { RotateCwIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAnalyticsContext } from "./analytics-provider";

const chartConfig = {
  http4xx: {
    label: "HTTP 4xx",
    color: "var(--chart-red-200)",
  },
  http5xx: {
    label: "HTTP 5xx",
    color: "var(--chart-red-400)",
  },
  timeout: {
    label: "Timeout",
    color: "var(--chart-red-600)",
  },
  other: {
    label: "Other",
    color: "var(--chart-red-800)",
  },
};

export function ErrorBreakdownChartCard() {
  const { params } = useAnalyticsContext();
  const analyticsErrorsQuery = useAnalyticsErrorsQuery({
    params: {
      from: params.from,
      to: params.to,
      bucket: params.bucket,
    },
  });

  if (analyticsErrorsQuery.status === "pending") {
    return <Skeleton className="w-full h-full rounded-xl" />;
  }

  if (analyticsErrorsQuery.status === "error") {
    console.error(analyticsErrorsQuery.error);
    return (
      <Card className="flex">
        <ErrorScreen
          title="Error fetching errors breakdown"
          description="Please try again later. If the problem persists, please contact support."
          actions={
            <Button
              disabled={analyticsErrorsQuery.isRefetching}
              onClick={() => analyticsErrorsQuery.refetch()}
              className="gap-2"
            >
              <RotateCwIcon
                className={cn(
                  "h-4 w-4",
                  analyticsErrorsQuery.isRefetching && "animate-spin",
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
        <CardTitle>Error breakdown</CardTitle>
        <CardDescription>
          Showing error breakdown in the {params.label}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart data={analyticsErrorsQuery.data.results}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => {
                if (analyticsErrorsQuery.data.info.bucket === "hour") {
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
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="http4xx"
              fill="var(--color-http4xx)"
              fillOpacity={0.4}
              stackId="a"
            />
            <Bar
              dataKey="http5xx"
              fill="var(--color-http5xx)"
              fillOpacity={0.4}
              stackId="a"
            />
            <Bar
              dataKey="timeout"
              fill="var(--color-timeout)"
              fillOpacity={0.4}
              stackId="a"
            />
            <Bar
              dataKey="other"
              fill="var(--color-other)"
              fillOpacity={0.4}
              stackId="a"
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
