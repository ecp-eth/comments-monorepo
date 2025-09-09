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
  success: {
    label: "Successes",
    color: "hsl(var(--chart-2))",
  },
  failure: {
    label: "Failures",
    color: "hsl(var(--chart-3))",
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

export function TerminalOutcomesChartCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Terminal outcomes</CardTitle>
        <CardDescription>
          Showing terminal outcomes in the last 7 days
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
              dataKey="successes"
              fill="var(--chart-success)"
              fillOpacity={0.4}
              stackId="a"
            />
            <Bar
              dataKey="failures"
              fill="var(--chart-failure)"
              fillOpacity={0.4}
              stackId="a"
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
