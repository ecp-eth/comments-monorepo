import { useWebhookAnalyticsVolumeQuery } from "@/queries/webhook";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "./ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
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

const chartConfig = {
  successes: {
    label: "Successes",
    color: "var(--chart-success)",
  },
  failures: {
    label: "Failures",
    color: "var(--chart-failure)",
  },
} satisfies ChartConfig;

export function AppWebhookDetailsVolumeChartCard({
  appId,
  webhookId,
}: {
  appId: string;
  webhookId: string;
}) {
  const [bucket, setBucket] = useState<"7" | "30" | "90">("7");
  const volumeQuery = useWebhookAnalyticsVolumeQuery({
    appId,
    webhookId,
    bucket,
  });

  if (volumeQuery.status === "pending") {
    return (
      <AppWebhookDetailsVolumeChartCardShell>
        <Skeleton className="h-full w-full" />
      </AppWebhookDetailsVolumeChartCardShell>
    );
  }

  if (volumeQuery.status === "error") {
    console.error(volumeQuery.error);

    return (
      <AppWebhookDetailsVolumeChartCardShell>
        <ErrorScreen
          title="Error fetching volume"
          description="Please try again later. If the problem persists, please contact support."
          actions={
            <Button
              disabled={volumeQuery.isRefetching}
              onClick={() => volumeQuery.refetch()}
              className="gap-2"
            >
              <RotateCwIcon className="h-4 w-4" />
              Retry
            </Button>
          }
        />
      </AppWebhookDetailsVolumeChartCardShell>
    );
  }

  if (volumeQuery.data.results.length === 0) {
    return (
      <AppWebhookDetailsVolumeChartCardShell>
        <EmptyScreen
          icon={<ChartAreaIcon />}
          title="No volume"
          description="There is no volume data available for this webhook"
        />
      </AppWebhookDetailsVolumeChartCardShell>
    );
  }

  return (
    <AppWebhookDetailsVolumeChartCardShell
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
      <ChartContainer config={chartConfig}>
        <AreaChart
          accessibilityLayer
          data={volumeQuery.data.results}
          margin={{ left: 12, right: 12 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="bucket"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) =>
              new Intl.DateTimeFormat(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              }).format(value)
            }
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="line" />}
          />
          <Area
            dataKey="successes"
            type="natural"
            fill="var(--color-successes)"
            fillOpacity={0.4}
            stroke="var(--color-successes)"
            stackId="a"
          />
          <Area
            dataKey="failures"
            type="natural"
            fill="var(--color-failures)"
            fillOpacity={0.4}
            stroke="var(--color-failures)"
            stackId="a"
          />
          <ChartLegend content={<ChartLegendContent />} />
        </AreaChart>
      </ChartContainer>
    </AppWebhookDetailsVolumeChartCardShell>
  );
}

function AppWebhookDetailsVolumeChartCardShell({
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
          <CardTitle>Volume</CardTitle>
          <CardDescription>Volume of webhook deliveries</CardDescription>
        </div>
        {filter}
      </CardHeader>
      <CardContent className="flex flex-1">{children}</CardContent>
    </Card>
  );
}
