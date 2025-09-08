"use client";

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

export default function AuthDashboardPage() {
  const meQuery = useMeQuery();
  const appsQuery = useAppsQuery({
    refetchOnMount: true,
  });

  if (meQuery.status === "pending" || appsQuery.status === "pending") {
    // @todo loading screen
    return null;
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

  // @todo render either statistics for all apps or empty screen if there are no apps

  return (
    <>
      <AppHeader breadcrumbs={[{ label: "Dashboard", href: "/" }]} />
      <AppContent className="flex-col gap-4">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          <div className="bg-muted/50 aspect-video rounded-xl" />
          <div className="bg-muted/50 aspect-video rounded-xl" />
          <div className="bg-muted/50 aspect-video rounded-xl" />
        </div>
        <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" />
      </AppContent>
    </>
  );
}
