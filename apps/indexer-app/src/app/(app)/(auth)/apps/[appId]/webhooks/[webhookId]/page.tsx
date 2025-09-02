"use client";

import { AppContent } from "@/components/app-content";
import { AppHeader } from "@/components/app-header";
import { WebhookNotFoundError } from "@/errors";
import { useAppQuery } from "@/queries/app";
import { useWebhookQuery } from "@/queries/webhook";
import { use } from "react";

export default function WebhookPage({
  params,
}: {
  params: Promise<{ appId: string; webhookId: string }>;
}) {
  const { appId, webhookId } = use(params);
  const appQuery = useAppQuery({ appId });
  const webhookQuery = useWebhookQuery({ appId, webhookId });

  if (webhookQuery.status === "pending") {
    // @todo loading screen
    return null;
  }

  if (
    webhookQuery.status === "error" &&
    webhookQuery.error instanceof WebhookNotFoundError
  ) {
    // @todo show webhook not found page
    return null;
  }

  if (webhookQuery.status === "error") {
    // @todo if error is different than UnauthorizedError, show error page
    return null;
  }

  if (appQuery.status === "pending") {
    // @todo loading screen
    return null;
  }

  if (appQuery.status === "error") {
    // @todo if error is different than UnauthorizedError, show error page
    return null;
  }

  // @todo render webhook details (deliveries + statistics)

  return (
    <>
      <AppHeader
        breadcrumbs={[
          { label: "Apps", href: "/apps" },
          {
            label: appQuery.data.name,
            href: `/apps/${appId}`,
          },
          {
            label: webhookQuery.data.name,
            href: `/apps/${appId}/webhooks/${webhookId}`,
          },
        ]}
      />
      <AppContent>Webhook</AppContent>
    </>
  );
}
