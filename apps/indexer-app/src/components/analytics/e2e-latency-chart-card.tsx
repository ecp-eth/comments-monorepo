import { Area, Line, CartesianGrid, XAxis, ComposedChart } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  ChartContainer,
  ChartLegendContent,
  ChartLegend,
  ChartTooltip,
  ChartTooltipContent,
} from "../ui/chart";
import { useAnalyticsE2ELatencyQuery } from "@/queries/analytics";
import { Skeleton } from "../ui/skeleton";
import { ErrorScreen } from "../error-screen";
import { Button } from "../ui/button";
import { RotateCwIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAnalyticsContext } from "./analytics-provider";
import { CustomChartTooltipContent } from "../ui/chart-custom";

function CustomTooltip({
  payload,
  ...props
}: React.ComponentProps<typeof ChartTooltipContent>) {
  return (
    <CustomChartTooltipContent
      {...props}
      // remove first 2 items because they are used only to render a band
      payload={payload?.slice(2)}
      indicator="line"
      hideLabel
      formatValue={(value) => {
        if ("DurationFormat" in Intl) {
          const valueMs = value.value! as number;
          const hours = Math.floor(valueMs / 3_600_000);
          const minutes = Math.floor((valueMs % 3_600_000) / 60_000);
          const seconds = Math.floor((valueMs % 60_000) / 1000);
          const milliseconds = Math.round(valueMs % 1000);

          // @ts-expect-error - DurationFormat is not supported in all browsers
          return new Intl.DurationFormat(undefined, {
            style: "short",
          }).format({
            seconds,
            minutes,
            hours,
            milliseconds,
          });
        }

        return value.value?.toLocaleString(undefined, {
          style: "unit",
          unit: "millisecond",
        });
      }}
    />
  );
}

const chartConfig = {
  p50: {
    label: "p50",
    color: "hsl(var(--chart-1))",
  },
  p90: {
    label: "p90",
    color: "hsl(var(--chart-2))",
  },
  p95: {
    label: "p95",
    color: "hsl(var(--chart-3))",
  },
  p99: {
    label: "p99",
    color: "hsl(var(--chart-4))",
  },
};

export function E2ELatencyChartCard() {
  const { params } = useAnalyticsContext();
  const analyticsE2ELatencyQuery = useAnalyticsE2ELatencyQuery({
    params: {
      from: params.from,
      to: params.to,
      bucket: params.bucket,
    },
  });

  if (analyticsE2ELatencyQuery.status === "pending") {
    return <Skeleton className="w-full h-full rounded-xl" />;
  }

  if (analyticsE2ELatencyQuery.status === "error") {
    console.error(analyticsE2ELatencyQuery.error);
    return (
      <Card className="flex">
        <ErrorScreen
          title="Error fetching end to end latency chart"
          description="Please try again later. If the problem persists, please contact support."
          actions={
            <Button
              onClick={() => analyticsE2ELatencyQuery.refetch()}
              className="gap-2"
              disabled={analyticsE2ELatencyQuery.isRefetching}
            >
              <RotateCwIcon
                className={cn(
                  "h-4 w-4",
                  analyticsE2ELatencyQuery.isRefetching && "animate-spin",
                )}
              />
              Retry
            </Button>
          }
        />
      </Card>
    );
  }

  const data = analyticsE2ELatencyQuery.data.results.map((result) => ({
    time: result.time,
    p50: result.latencies.p50,
    p90: result.latencies.p90,
    p95: result.latencies.p95,
    p99: result.latencies.p99,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>End to end latency</CardTitle>
        <CardDescription>
          Showing end to end latency in the {params.label}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ComposedChart data={data} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => {
                if (analyticsE2ELatencyQuery.data.info.bucket === "hour") {
                  return value.toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "numeric",
                  });
                }

                return value.toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                });
              }}
            />
            <ChartTooltip cursor={false} content={<CustomTooltip />} />
            <ChartLegend content={<ChartLegendContent />} />
            <defs>
              <linearGradient id="ribbonFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            {/* pushes the p95 band up to the p50 line */}
            <Area
              type="monotone"
              dataKey={(data) => data.p50}
              name="p50_band"
              label={false}
              stackId="ribbon"
              stroke="none"
              fill="transparent"
              activeDot={false}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              label={false}
              dataKey={(data) => Math.max(0, data.p95 - data.p50)}
              stackId="ribbon"
              name="p50-p95 band"
              stroke="none"
              fill="url(#ribbonFill)"
              isAnimationActive={false}
            />
            <Line
              dataKey="p50"
              type="monotone"
              fill="var(--color-p50)"
              fillOpacity={0.4}
              stroke="var(--color-p50)"
            />
            <Line
              dataKey="p90"
              type="monotone"
              fill="var(--color-p90)"
              fillOpacity={0.4}
              stroke="var(--color-p90)"
            />
            <Line
              dataKey="p95"
              type="monotone"
              fill="var(--color-p95)"
              fillOpacity={0.4}
              stroke="var(--color-p95)"
            />
            <Line
              dataKey="p99"
              type="monotone"
              fill="var(--color-p99)"
              fillOpacity={0.4}
              stroke="var(--color-p99)"
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
