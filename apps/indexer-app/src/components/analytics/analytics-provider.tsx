"use client";

import { createContext, useContext, useMemo, useState } from "react";

type TimePeriod = "1d" | "7d" | "30d" | "90d";

type AnalyticsContextValue = {
  timePeriod: TimePeriod;
  params: {
    bucket: "hour" | "day" | "month";
    from: Date;
    to: Date;
    label: string;
  };
  setTimePeriod: (timePeriod: TimePeriod) => void;
};

const context = createContext<AnalyticsContextValue>({
  timePeriod: "7d",
  params: {
    bucket: "day",
    from: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    to: new Date(),
    label: "last 7 days",
  },
  setTimePeriod: () => {},
});

function subtractTimePeriodFromDate(date: Date, timePeriod: TimePeriod): Date {
  switch (timePeriod) {
    case "1d":
      return new Date(date.getTime() - 1000 * 60 * 60 * 24);
    case "7d":
      return new Date(date.getTime() - 1000 * 60 * 60 * 24 * 7);
    case "30d":
      return new Date(date.getTime() - 1000 * 60 * 60 * 24 * 30);
    case "90d":
      return new Date(date.getTime() - 1000 * 60 * 60 * 24 * 90);
    default:
      timePeriod satisfies never;
      throw new Error(`Invalid time period: ${timePeriod}`);
  }
}

function timePeriodToLabel(timePeriod: TimePeriod): string {
  switch (timePeriod) {
    case "1d":
      return "last day";
    case "7d":
      return "last 7 days";
    case "30d":
      return "last 30 days";
    case "90d":
      return "last 90 days";
    default:
      timePeriod satisfies never;
      throw new Error(`Invalid time period: ${timePeriod}`);
  }
}

export function AnalyticsProvider({
  children,
  defaultTimePeriod = "7d",
}: {
  defaultTimePeriod?: TimePeriod;
  children: React.ReactNode;
}) {
  const [value, setValue] = useState<
    Omit<AnalyticsContextValue, "setTimePeriod" | "params">
  >(() => ({
    timePeriod: defaultTimePeriod,
  }));

  const contextValue = useMemo(() => {
    const to = new Date();

    return {
      ...value,
      params: {
        bucket:
          value.timePeriod === "1d" ? ("hour" as const) : ("day" as const),
        from: subtractTimePeriodFromDate(to, value.timePeriod),
        to,
        label: timePeriodToLabel(value.timePeriod),
      },
      setTimePeriod: (timePeriod: TimePeriod) => {
        setValue((prev) => ({ ...prev, timePeriod }));
      },
    };
  }, [value]);

  return <context.Provider value={contextValue}>{children}</context.Provider>;
}

export function useAnalyticsContext(): AnalyticsContextValue {
  return useContext(context);
}
