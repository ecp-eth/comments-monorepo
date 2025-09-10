import { LineChart, Line, CartesianGrid, XAxis } from "recharts";
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
import { useAnalyticsSlaBandsQuery } from "@/queries/analytics";
import { ErrorScreen } from "../error-screen";
import { Skeleton } from "../ui/skeleton";
import { Button } from "../ui/button";
import { RotateCwIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAnalyticsContext } from "./analytics-provider";

const chartConfig = {
  "10s": {
    label: "≤10s",
    color: "hsl(var(--chart-2))",
  },
  "30s": {
    label: "≤30s",
    color: "hsl(var(--chart-3))",
  },
  "60s": {
    label: "≤60s",
    color: "hsl(var(--chart-4))",
  },
  "300s": {
    label: "≤300s",
    color: "hsl(var(--chart-5))",
  },
};

export function SlaBandsChartCard() {
  const { params } = useAnalyticsContext();
  const analyticsSlaBandsQuery = useAnalyticsSlaBandsQuery({
    params: {
      from: params.from,
      to: params.to,
      bucket: params.bucket,
    },
  });

  if (analyticsSlaBandsQuery.status === "pending") {
    return <Skeleton className="w-full h-full rounded-xl" />;
  }

  if (analyticsSlaBandsQuery.status === "error") {
    return (
      <Card className="flex">
        <ErrorScreen
          title="Error fetching SLA bands"
          description="Please try again later. If the problem persists, please contact support."
          actions={
            <Button
              onClick={() => analyticsSlaBandsQuery.refetch()}
              disabled={analyticsSlaBandsQuery.isRefetching}
              className="gap-2"
            >
              <RotateCwIcon
                className={cn(
                  "h-4 w-4",
                  analyticsSlaBandsQuery.isRefetching && "animate-spin",
                )}
              />
              Retry
            </Button>
          }
        />
      </Card>
    );
  }

  const data = analyticsSlaBandsQuery.data.results.map((result) => ({
    time: result.time,
    ...result.bands,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>SLA bands</CardTitle>
        <CardDescription>
          Showing SLA bands in the {params.label}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart data={data} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => {
                if (analyticsSlaBandsQuery.data.info.bucket === "hour") {
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
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" hideLabel />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              dataKey="10s"
              name="10s"
              type="monotone"
              fill="var(--color-10s)"
              fillOpacity={0.4}
              stroke="var(--color-10s)"
            />
            <Line
              dataKey="30s"
              name="30s"
              type="monotone"
              fill="var(--color-30s)"
              fillOpacity={0.4}
              stroke="var(--color-30s)"
            />
            <Line
              dataKey="60s"
              name="60s"
              type="monotone"
              fill="var(--color-60s)"
              fillOpacity={0.4}
              stroke="var(--color-60s)"
            />
            <Line
              dataKey="300s"
              name="300s"
              type="monotone"
              fill="var(--color-300s)"
              fillOpacity={0.4}
              stroke="var(--color-300s)"
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
