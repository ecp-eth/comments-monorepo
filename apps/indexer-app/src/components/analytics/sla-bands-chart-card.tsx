import { LineChart, Line, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart";

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

const data = [
  {
    time: new Date().toISOString(),
    percentiles: {
      "10s": 15,
      "30s": 30,
      "60s": 50,
      "300s": 51,
    },
  },
  {
    time: new Date(
      new Date().getTime() - 1000 * 60 * 60 * 24 * 1,
    ).toISOString(),
    percentiles: {
      "10s": 30,
      "30s": 30,
      "60s": 50,
      "300s": 50,
    },
  },
  {
    time: new Date(
      new Date().getTime() - 1000 * 60 * 60 * 24 * 2,
    ).toISOString(),
    percentiles: {
      "10s": 15,
      "30s": 30,
      "60s": 50,
      "300s": 51,
    },
  },
  {
    time: new Date(
      new Date().getTime() - 1000 * 60 * 60 * 24 * 3,
    ).toISOString(),
    percentiles: {
      "10s": 5,
      "30s": 51,
      "60s": 51,
      "300s": 51,
    },
  },
];

export function SlaBandsChartCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>SLA bands</CardTitle>
        <CardDescription>Showing SLA bands in the last 7 days</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart data={data}>
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
            <Line
              dataKey="percentiles.10s"
              name="10s"
              type="natural"
              fill="var(--color-10s)"
              fillOpacity={0.4}
              stroke="var(--color-10s)"
            />
            <Line
              dataKey="percentiles.30s"
              name="30s"
              type="natural"
              fill="var(--color-30s)"
              fillOpacity={0.4}
              stroke="var(--color-30s)"
            />
            <Line
              dataKey="percentiles.60s"
              name="60s"
              type="natural"
              fill="var(--color-60s)"
              fillOpacity={0.4}
              stroke="var(--color-60s)"
            />
            <Line
              dataKey="percentiles.300s"
              name="300s"
              type="natural"
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
