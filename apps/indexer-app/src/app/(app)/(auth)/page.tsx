"use client";

import { DeliveriesKpiCard } from "@/components/analytics/deliveries-kpi-card";
import { DeliveriesEventualSuccessKpiCard } from "@/components/analytics/deliveries-eventual-success-kpi-card";
import { DeliveriesFirstAttemptSuccessKpiCard } from "@/components/analytics/deliveries-first-attempt-success-kpi-card";
import { EndToEndLatencyKpiCard } from "@/components/analytics/end-to-end-latency-kpi-card";
import { BacklogSizeKpiCard } from "@/components/analytics/backlog-size-kpi-card";
import { DeliveriesInMinuteKpiCard } from "@/components/analytics/deliveries-in-minute-kpi-card";
import { AppContent } from "@/components/app-content";
import { AppHeader } from "@/components/app-header";
import { CreateAppDialogButton } from "@/components/create-app-dialog-button";
import { EmptyScreen } from "@/components/empty-screen";
import { ErrorScreen } from "@/components/error-screen";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppsQuery } from "@/queries/apps";
import { useMeQuery } from "@/queries/me";
import { RotateCwIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AttemptsOverTimeChartCard } from "@/components/analytics/attempts-over-time-chart-card";
import { TerminalOutcomesChartCard } from "@/components/analytics/terminal-outcomes-chart-card";
import { SuccessRatesChartCard } from "@/components/analytics/success-rates-chart-card";
import { E2ELatencyChartCard } from "@/components/analytics/e2e-latency-chart-card";
import { ErrorBreakdownChartCard } from "@/components/analytics/error-breakdown-chart-card";
import { SlaBandsChartCard } from "@/components/analytics/sla-bands-chart-card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  AnalyticsProvider,
  useAnalyticsContext,
} from "@/components/analytics/analytics-provider";

export default function AuthDashboardPage() {
  const meQuery = useMeQuery();
  const appsQuery = useAppsQuery({
    refetchOnMount: true,
  });

  if (meQuery.status === "pending" || appsQuery.status === "pending") {
    return (
      <>
        <AppHeader breadcrumbs={[{ label: "Dashboard", href: "/" }]} />
        <AppContent className="flex-col gap-4">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <Skeleton className="rounded-xl min-h-[160px]" />
            <Skeleton className="rounded-xl min-h-[160px]" />
            <Skeleton className="rounded-xl min-h-[160px]" />
            <Skeleton className="rounded-xl min-h-[160px]" />
            <Skeleton className="rounded-xl min-h-[160px]" />
            <Skeleton className="rounded-xl min-h-[160px]" />
          </div>
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <Skeleton className="rounded-xl aspect-video" />
            <Skeleton className="rounded-xl aspect-video" />
            <Skeleton className="rounded-xl aspect-video" />
          </div>
        </AppContent>
      </>
    );
  }

  if (appsQuery.status === "error") {
    return (
      <>
        <AppHeader breadcrumbs={[{ label: "Dashboard", href: "/" }]} />
        <AppContent className="flex-col gap-4">
          <ErrorScreen
            title="Error fetching your apps"
            description="Please try again later. If the problem persists, please contact support."
            actions={
              <Button
                disabled={appsQuery.isRefetching}
                onClick={() => appsQuery.refetch()}
                className="gap-2"
              >
                <RotateCwIcon
                  className={cn(
                    "h-4 w-4",
                    appsQuery.isRefetching && "animate-spin",
                  )}
                />
                Retry
              </Button>
            }
          />
        </AppContent>
      </>
    );
  }

  if (meQuery.status === "error") {
    return (
      <>
        <AppHeader breadcrumbs={[{ label: "Dashboard", href: "/" }]} />
        <AppContent className="flex-col gap-4">
          <ErrorScreen
            title="Error fetching your identity"
            description="Please try again later. If the problem persists, please contact support."
            actions={
              <Button
                disabled={meQuery.isRefetching}
                onClick={() => meQuery.refetch()}
                className="gap-2"
              >
                <RotateCwIcon
                  className={cn(
                    "h-4 w-4",
                    meQuery.isRefetching && "animate-spin",
                  )}
                />
                Retry
              </Button>
            }
          />
        </AppContent>
      </>
    );
  }

  if (appsQuery.data.results.length === 0) {
    return (
      <>
        <AppHeader breadcrumbs={[{ label: "Dashboard", href: "/" }]} />
        <AppContent className="flex-col gap-4">
          <EmptyScreen
            title="No apps"
            description="You don't have any apps yet"
            actions={<CreateAppDialogButton />}
          />
        </AppContent>
      </>
    );
  }

  return (
    <>
      <AppHeader breadcrumbs={[{ label: "Dashboard", href: "/" }]} />
      <AppContent className="flex-col gap-4">
        <AnalyticsProvider>
          <div className="flex w-full justify-end">
            <TimePeriodSelect />
          </div>
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <DeliveriesKpiCard />
            <DeliveriesFirstAttemptSuccessKpiCard />
            <DeliveriesEventualSuccessKpiCard />
            <EndToEndLatencyKpiCard />
            <BacklogSizeKpiCard />
            <DeliveriesInMinuteKpiCard />
          </div>
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <AttemptsOverTimeChartCard />
            <TerminalOutcomesChartCard />
            <SuccessRatesChartCard />
            <E2ELatencyChartCard />
            <ErrorBreakdownChartCard />
            <SlaBandsChartCard />
          </div>
        </AnalyticsProvider>
      </AppContent>
    </>
  );
}

function TimePeriodSelect() {
  const { timePeriod, setTimePeriod } = useAnalyticsContext();

  return (
    <Select value={timePeriod} onValueChange={setTimePeriod}>
      <SelectTrigger className="max-w-[200px]">
        <SelectValue placeholder="Select a time period" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="1d">Last day</SelectItem>
        <SelectItem value="7d">Last 7 days</SelectItem>
        <SelectItem value="30d">Last 30 days</SelectItem>
        <SelectItem value="90d">Last 90 days</SelectItem>
      </SelectContent>
    </Select>
  );
}
