import { Area, Line, CartesianGrid, XAxis, ComposedChart } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart";

function CustomTooltip({
  payload,
  ...props
}: React.ComponentProps<typeof ChartTooltipContent>) {
  return (
    <ChartTooltipContent
      {...props}
      // remove first 2 items because they are used only to render a band
      payload={payload?.slice(2)}
      indicator="dot"
      hideLabel
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

const data = [
  {
    time: new Date().toISOString(),
    p50: 1100,
    p90: 2700,
    p95: 3500,
    p99: 5000,
  },
  {
    time: new Date(
      new Date().getTime() - 1000 * 60 * 60 * 24 * 1,
    ).toISOString(),
    p50: 1200,
    p90: 2700,
    p95: 3600,
    p99: 5000,
  },
  {
    time: new Date(
      new Date().getTime() - 1000 * 60 * 60 * 24 * 2,
    ).toISOString(),
    p50: 900,
    p90: 2700,
    p95: 3300,
    p99: 5000,
  },
  {
    time: new Date(
      new Date().getTime() - 1000 * 60 * 60 * 24 * 3,
    ).toISOString(),
    p50: 1600,
    p90: 2700,
    p95: 3500,
    p99: 5000,
  },
];

export function E2ELatencyChartCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>End to end latency</CardTitle>
        <CardDescription>
          Showing end to end latency in the last 7 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ComposedChart data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => {
                const date = new Date(value);
                return new Intl.DateTimeFormat(undefined, {
                  day: "numeric",
                  month: "short",
                }).format(date);
              }}
            />
            <ChartTooltip cursor={false} content={<CustomTooltip />} />
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
