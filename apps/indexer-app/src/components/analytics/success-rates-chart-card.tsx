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
  firstAttemptSuccesses: {
    label: "First attempt rate",
    color: "hsl(var(--chart-2))",
  },
  eventualSuccesses: {
    label: "Eventual attempt rate",
    color: "hsl(var(--chart-3))",
  },
};

const data = [
  {
    time: new Date().toISOString(),
    firstAttemptSuccesses: 100,
    eventualSuccesses: 10,
  },
  {
    time: new Date(
      new Date().getTime() - 1000 * 60 * 60 * 24 * 1,
    ).toISOString(),
    firstAttemptSuccesses: 70,
    eventualSuccesses: 30,
  },
  {
    time: new Date(
      new Date().getTime() - 1000 * 60 * 60 * 24 * 2,
    ).toISOString(),
    firstAttemptSuccesses: 60,
    eventualSuccesses: 50,
  },
  {
    time: new Date(
      new Date().getTime() - 1000 * 60 * 60 * 24 * 3,
    ).toISOString(),
    firstAttemptSuccesses: 40,
    eventualSuccesses: 30,
  },
];

export function SuccessRatesChartCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Success rates</CardTitle>
        <CardDescription>
          Showing success rates in the last 7 days
        </CardDescription>
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
              dataKey="firstAttemptSuccesses"
              type="natural"
              fill="var(--color-firstAttemptSuccesses)"
              fillOpacity={0.4}
              stroke="var(--color-firstAttemptSuccesses)"
            />
            <Line
              dataKey="eventualSuccesses"
              type="natural"
              fill="var(--color-eventualSuccesses)"
              fillOpacity={0.4}
              stroke="var(--color-eventualSuccesses)"
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
