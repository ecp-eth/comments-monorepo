"use client";

import { AppHeader } from "@/components/app-header";
import { AppContent } from "@/components/app-content";
import { useAppsQuery } from "@/queries/apps";
import { useMeQuery } from "@/queries/me";

export default function AppsPage() {
  const meQuery = useMeQuery();
  const appsQuery = useAppsQuery();

  if (meQuery.status === "pending") {
    // @todo loading screen
    return null;
  }

  if (meQuery.status === "error") {
    // @todo if error is different than UnauthorizedError, show error page
    return null;
  }

  if (appsQuery.status === "pending") {
    // @todo loading screen
    return null;
  }

  if (appsQuery.status === "error") {
    // @todo if error is different than UnauthorizedError, show error page
    return null;
  }

  // @todo render empty screen if there are no apps

  return (
    <>
      <AppHeader breadcrumbs={[{ label: "Apps", href: "/apps" }]} />
      <AppContent>Apps</AppContent>
    </>
  );
}
