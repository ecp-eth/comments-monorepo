"use client";

import { AppHeader } from "@/components/app-header";
import { AppContent } from "@/components/app-content";
import { AppNotFoundError } from "@/errors";
import { useAppQuery } from "@/queries/app";
import { use } from "react";

export default function AppPage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId } = use(params);
  const appQuery = useAppQuery({ appId });

  if (appQuery.status === "pending") {
    // @todo loading screen
    return null;
  }

  if (
    appQuery.status === "error" &&
    appQuery.error instanceof AppNotFoundError
  ) {
    // @todo show app not found page
    return null;
  }

  if (appQuery.status === "error") {
    // @todo if error is different than UnauthorizedError, show error page
    return null;
  }

  // @todo render app details + statistics + webhooks

  return (
    <>
      <AppHeader
        breadcrumbs={[
          { label: "Apps", href: "/apps" },
          { label: appQuery.data.name, href: `/apps/${appId}` },
        ]}
      />
      <AppContent>App</AppContent>
    </>
  );
}
