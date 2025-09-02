"use client";

import { AppContent } from "@/components/app-content";
import { AppHeader } from "@/components/app-header";
import { useMeQuery } from "@/queries/me";

export default function AuthDashboardPage() {
  const meQuery = useMeQuery();

  if (meQuery.status === "pending") {
    // @todo loading screen
    return null;
  }

  if (meQuery.status === "error") {
    // @todo if error is different than UnauthorizedError, show error page
    return null;
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
