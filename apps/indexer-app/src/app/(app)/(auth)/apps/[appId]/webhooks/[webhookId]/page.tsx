"use client";

import type { AppSchemaType, AppWebhookSchemaType } from "@/api/schemas/apps";
import { AppContent } from "@/components/app-content";
import { AppHeader } from "@/components/app-header";
import { AppWebhookDetailsAuthForm } from "@/components/app-webhook-details-auth-form";
import { AppWebhookDetailsDeleteButton } from "@/components/app-webhook-details-delete-button";
import { AppWebhookDetailsEventsForm } from "@/components/app-webhook-details-events-form";
import { AppWebhookDetailsRenameForm } from "@/components/app-webhook-details-rename-form";
import { AppWebhookDetailsTestButton } from "@/components/app-webhook-details-test-button";
import { AppWebhookDetailsUrlForm } from "@/components/app-webhook-details-url-form";
import { ErrorScreen } from "@/components/error-screen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WebhookNotFoundError } from "@/errors";
import { useProtectRoute } from "@/hooks/use-protect-route";
import { useAppQuery } from "@/queries/app";
import { useWebhookQuery } from "@/queries/webhook";
import { RotateCwIcon } from "lucide-react";
import Link from "next/link";
import { use } from "react";

export default function WebhookPage({
  params,
}: {
  params: Promise<{ appId: string; webhookId: string }>;
}) {
  const { appId, webhookId } = use(params);
  const appQuery = useAppQuery({ appId });
  const webhookQuery = useWebhookQuery({ appId, webhookId });

  useProtectRoute(appQuery);
  useProtectRoute(webhookQuery);

  if (webhookQuery.status === "pending" || appQuery.status === "pending") {
    // @todo loading screen
    return null;
  }

  if (
    webhookQuery.status === "error" &&
    webhookQuery.error instanceof WebhookNotFoundError
  ) {
    return (
      <>
        <AppHeader
          breadcrumbs={[
            { label: "Apps", href: "/apps" },
            ...(appQuery.data
              ? [{ label: appQuery.data.name, href: `/apps/${appId}` }]
              : []),
          ]}
        />
        <ErrorScreen
          title="Webhook not found"
          description="The webhook you are looking for does not exist."
          actions={
            <Button asChild>
              <Link href={`/apps/${appId}`}>Go back</Link>
            </Button>
          }
        />
      </>
    );
  }

  if (webhookQuery.status === "error") {
    console.error(webhookQuery.error);

    return (
      <>
        <AppHeader
          breadcrumbs={[
            { label: "Apps", href: "/apps" },
            ...(appQuery.data
              ? [{ label: appQuery.data.name, href: `/apps/${appId}` }]
              : []),
          ]}
        />
        <ErrorScreen
          title="Error fetching webhook"
          description="Please try again later. If the problem persists, please contact support."
          actions={
            <Button
              disabled={webhookQuery.isRefetching}
              onClick={() => webhookQuery.refetch()}
              className="gap-2"
            >
              <RotateCwIcon className="h-4 w-4" />
              Retry
            </Button>
          }
        />
      </>
    );
  }

  if (appQuery.status === "error") {
    console.error(appQuery.error);

    return (
      <>
        <AppHeader
          breadcrumbs={[
            { label: "Apps", href: "/apps" },
            ...(appQuery.data
              ? [{ label: appQuery.data.name, href: `/apps/${appId}` }]
              : []),
            {
              label: webhookQuery.data.name,
              href: `/apps/${appId}/webhooks/${webhookId}`,
            },
          ]}
        />
        <ErrorScreen
          title="Error fetching app"
          description="Please try again later. If the problem persists, please contact support."
          actions={
            <Button
              disabled={appQuery.isRefetching}
              onClick={() => appQuery.refetch()}
              className="gap-2"
            >
              <RotateCwIcon className="h-4 w-4" />
              Retry
            </Button>
          }
        />
      </>
    );
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
      <AppContent className="flex-col gap-4">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3 w-full">
          <WebhookDetailsCard app={appQuery.data} webhook={webhookQuery.data} />

          <div className="bg-muted/50 aspect-video rounded-xl" />
          <div className="bg-muted/50 aspect-video rounded-xl" />
        </div>
        <div className="flex flex-col flex-1 gap-4">
          <h2 className="text-lg font-medium">Deliveries</h2>
          <div className="bg-muted/50 aspect-video rounded-xl" />
        </div>
      </AppContent>
    </>
  );
}

function WebhookDetailsCard({
  app,
  webhook,
}: {
  app: AppSchemaType;
  webhook: AppWebhookSchemaType;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhook Details</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <AppWebhookDetailsRenameForm app={app} webhook={webhook} />
        <AppWebhookDetailsUrlForm app={app} webhook={webhook} />
        <AppWebhookDetailsEventsForm app={app} webhook={webhook} />
        <AppWebhookDetailsAuthForm app={app} webhook={webhook} />
        <div className="flex flex-row gap-2 pt-4">
          <AppWebhookDetailsDeleteButton app={app} webhook={webhook} />
          <AppWebhookDetailsTestButton app={app} webhook={webhook} />
        </div>
      </CardContent>
    </Card>
  );
}
