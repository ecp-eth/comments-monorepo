import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart";

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

const data = [
  {
    time: new Date().toISOString(),
    http4xx: 10,
    http5xx: 5,
    timeout: 0,
    other: 0,
  },
  {
    time: new Date(
      new Date().getTime() - 1000 * 60 * 60 * 24 * 1,
    ).toISOString(),
    http4xx: 7,
    http5xx: 3,
    timeout: 0,
    other: 0,
  },
  {
    time: new Date(
      new Date().getTime() - 1000 * 60 * 60 * 24 * 2,
    ).toISOString(),
    http4xx: 6,
    http5xx: 5,
    timeout: 0,
    other: 0,
  },
  {
    time: new Date(
      new Date().getTime() - 1000 * 60 * 60 * 24 * 3,
    ).toISOString(),
    http4xx: 4,
    http5xx: 3,
    timeout: 10,
    other: 5,
  },
];

export function ErrorBreakdownChartCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Error breakdown</CardTitle>
        <CardDescription>
          Showing error breakdown in the last 7 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart data={data}>
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
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" hideLabel />}
            />
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
