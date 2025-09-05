import { useWebhookAnalyticsLatencyResponseHistogramQuery } from "@/queries/webhook";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { ErrorScreen } from "./error-screen";
import { ChartAreaIcon, RotateCwIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { EmptyScreen } from "./empty-screen";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useState } from "react";

export function AppWebhookDetailsChartCardBackendLatency({
  appId,
  webhookId,
}: {
  appId: string;
  webhookId: string;
}) {
  const [bucket, setBucket] = useState<"7" | "30" | "90">("7");
  const backendLatencyHistogramQuery =
    useWebhookAnalyticsLatencyResponseHistogramQuery({
      appId,
      webhookId,
      bucket,
    });

  if (backendLatencyHistogramQuery.status === "pending") {
    return (
      <AppWebhookDetailsChartCardBackendLatencyShell>
        <Skeleton className="h-full w-full" />
      </AppWebhookDetailsChartCardBackendLatencyShell>
    );
  }

  if (backendLatencyHistogramQuery.status === "error") {
    console.error(backendLatencyHistogramQuery.error);

    return (
      <AppWebhookDetailsChartCardBackendLatencyShell>
        <ErrorScreen
          title="Error fetching backend latency"
          description="Please try again later. If the problem persists, please contact support."
          actions={
            <Button
              disabled={backendLatencyHistogramQuery.isRefetching}
              onClick={() => backendLatencyHistogramQuery.refetch()}
              className="gap-2"
            >
              <RotateCwIcon className="h-4 w-4" />
              Retry
            </Button>
          }
        />
      </AppWebhookDetailsChartCardBackendLatencyShell>
    );
  }

  if (backendLatencyHistogramQuery.data.results.length === 0) {
    return (
      <AppWebhookDetailsChartCardBackendLatencyShell>
        <EmptyScreen
          icon={<ChartAreaIcon />}
          title="No backend latency"
          description="There is no backend latency data available for this webhook"
        />
      </AppWebhookDetailsChartCardBackendLatencyShell>
    );
  }

  const chartConfig = {
    count: {
      label: "Count",
      color: "hsl(var(--chart-2))",
    },
  } satisfies Record<string, { label: string; color: string }>;

  const chartData = backendLatencyHistogramQuery.data.results.map((result) => ({
    bin: result.bin,
    count: Number(result.count),
    label: result.label,
  }));

  return (
    <AppWebhookDetailsChartCardBackendLatencyShell
      filter={
        <Select
          value={bucket}
          onValueChange={(value) => setBucket(value as "7" | "30" | "90")}
        >
          <SelectTrigger
            className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
            aria-label="Select a value"
          >
            <SelectValue placeholder="Last 7 days" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <ChartContainer className="w-full aspect-video" config={chartConfig}>
        <BarChart
          accessibilityLayer
          data={chartData}
          margin={{ left: 12, right: 12 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="bin"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => {
              const result = chartData.find((r) => r.bin === value);
              return result?.label || value;
            }}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Bar
            dataKey="count"
            fill="hsl(var(--chart-2))"
            fillOpacity={0.8}
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ChartContainer>
    </AppWebhookDetailsChartCardBackendLatencyShell>
  );
}

function AppWebhookDetailsChartCardBackendLatencyShell({
  children,
  filter,
}: {
  children: React.ReactNode;
  filter?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex items-center gap-2 space-y-0 py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Backend latency</CardTitle>
          <CardDescription>
            Backend latency of webhook deliveries
          </CardDescription>
        </div>
        {filter}
      </CardHeader>
      <CardContent className="flex flex-1 min-h-[300px]">
        {children}
      </CardContent>
    </Card>
  );
}
