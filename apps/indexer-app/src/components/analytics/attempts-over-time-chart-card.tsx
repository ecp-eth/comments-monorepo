import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart";

const chartConfig = {
  success: {
    label: "Successes",
    color: "var(--chart-success)",
  },
  failure: {
    label: "Failures",
    color: "var(--chart-failure)",
  },
};

const data = [
  {
    time: new Date().toISOString(),
    successes: 100,
    failures: 10,
  },
  {
    time: new Date(
      new Date().getTime() - 1000 * 60 * 60 * 24 * 1,
    ).toISOString(),
    successes: 70,
    failures: 30,
  },
  {
    time: new Date(
      new Date().getTime() - 1000 * 60 * 60 * 24 * 2,
    ).toISOString(),
    successes: 60,
    failures: 50,
  },
  {
    time: new Date(
      new Date().getTime() - 1000 * 60 * 60 * 24 * 3,
    ).toISOString(),
    successes: 40,
    failures: 30,
  },
];

export function AttemptsOverTimeChartCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Attempts over time</CardTitle>
        <CardDescription>
          Showing attemts over time in the last 7 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart data={data}>
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
            <defs>
              <linearGradient id="fillSuccesses" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-success)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-success)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillFailures" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-failure)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-failure)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <Area
              dataKey="successes"
              type="natural"
              fill="url(#fillSuccesses)"
              fillOpacity={0.4}
              stroke="var(--color-success)"
              stackId="a"
            />
            <Area
              dataKey="failures"
              type="natural"
              fill="url(#fillFailures)"
              fillOpacity={0.4}
              stroke="var(--color-failure)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
