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
import { useAnalyticsSuccessRatesQuery } from "@/queries/analytics";
import { Skeleton } from "../ui/skeleton";
import { ErrorScreen } from "../error-screen";
import { Button } from "../ui/button";
import { RotateCwIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAnalyticsContext } from "./analytics-provider";

const chartConfig = {
  firstSuccessRate: {
    label: "First attempt rate",
    color: "hsl(var(--chart-2))",
  },
  eventualSuccessRate: {
    label: "Eventual attempt rate",
    color: "hsl(var(--chart-3))",
  },
};

export function SuccessRatesChartCard() {
  const { params } = useAnalyticsContext();
  const analyticsSuccessRatesQuery = useAnalyticsSuccessRatesQuery();

  if (analyticsSuccessRatesQuery.status === "pending") {
    return <Skeleton className="w-full h-full rounded-xl" />;
  }

  if (analyticsSuccessRatesQuery.status === "error") {
    console.error(analyticsSuccessRatesQuery.error);
    return (
      <Card className="flex">
        <ErrorScreen
          title="Error fetching success rates"
          description="Please try again later. If the problem persists, please contact support."
          actions={
            <Button
              onClick={() => analyticsSuccessRatesQuery.refetch()}
              className="gap-2"
              disabled={analyticsSuccessRatesQuery.isRefetching}
            >
              <RotateCwIcon
                className={cn(
                  "h-4 w-4",
                  analyticsSuccessRatesQuery.isRefetching && "animate-spin",
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
        <CardTitle>Success rates</CardTitle>
        <CardDescription>
          Showing success rates in the {params.label}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart data={analyticsSuccessRatesQuery.data.results}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => {
                if (analyticsSuccessRatesQuery.data.info.bucket === "hour") {
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
            <Line
              dataKey="firstSuccessRate"
              type="natural"
              fill="var(--color-firstSuccessRate)"
              fillOpacity={0.4}
              stroke="var(--color-firstSuccessRate)"
            />
            <Line
              dataKey="eventualSuccessRate"
              type="natural"
              fill="var(--color-eventualSuccessRate)"
              fillOpacity={0.4}
              stroke="var(--color-eventualSuccessRate)"
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
