"use client";

import type {
  AppSchemaType,
  AppWebhookListDeliveryAttemptsResponseSchemaType,
  AppWebhookSchemaType,
} from "@/api/schemas/apps";
import { AppContent } from "@/components/app-content";
import { AppHeader } from "@/components/app-header";
import { AppWebhookDetailsAuthForm } from "@/components/app-webhook-details-auth-form";
import { AppWebhookDetailsDeleteButton } from "@/components/app-webhook-details-delete-button";
import { AppWebhookDetailsEventsForm } from "@/components/app-webhook-details-events-form";
import { AppWebhookDetailsRenameForm } from "@/components/app-webhook-details-rename-form";
import { AppWebhookDetailsTestButton } from "@/components/app-webhook-details-test-button";
import { AppWebhookDetailsUrlForm } from "@/components/app-webhook-details-url-form";
import { AppWebhookDetailsVolumeChartCard } from "@/components/app-webhook-details-volume-chart-card";
import { DataTable } from "@/components/data-table";
import { EmptyScreen } from "@/components/empty-screen";
import { ErrorScreen } from "@/components/error-screen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WebhookNotFoundError } from "@/errors";
import { useProtectRoute } from "@/hooks/use-protect-route";
import { useAppQuery } from "@/queries/app";
import {
  useWebhookAnalyticsBacklogQuery,
  useWebhookDeliveryAttemptsQuery,
  useWebhookQuery,
} from "@/queries/webhook";
import type { ColumnDef } from "@tanstack/react-table";
import { RotateCwIcon, WebhookIcon } from "lucide-react";
import Link from "next/link";
import { use, useMemo } from "react";

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
          <WebhookAnalyticsBacklogCard appId={appId} webhookId={webhookId} />
          <AppWebhookDetailsVolumeChartCard
            appId={appId}
            webhookId={webhookId}
          />
        </div>
        <div className="flex flex-col flex-1 gap-4">
          <h2 className="text-lg font-medium">Deliveries</h2>
          <WebhookDeliveryAttemptsList appId={appId} webhookId={webhookId} />
        </div>
      </AppContent>
    </>
  );
}

function WebhookAnalyticsBacklogCard({
  appId,
  webhookId,
}: {
  appId: string;
  webhookId: string;
}) {
  const analyticsBacklogQuery = useWebhookAnalyticsBacklogQuery({
    appId,
    webhookId,
  });

  useProtectRoute(analyticsBacklogQuery);

  if (analyticsBacklogQuery.status === "error") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Webhook Backlog</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorScreen
            title="Error fetching analytics backlog"
            description="Please try again later. If the problem persists, please contact support."
            actions={
              <Button
                disabled={analyticsBacklogQuery.isRefetching}
                onClick={() => analyticsBacklogQuery.refetch()}
                className="gap-2"
                type="button"
              >
                <RotateCwIcon className="h-4 w-4" />
                Retry
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhook Backlog</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          <div className="flex flex-row gap-2">
            <div className="flex flex-col gap-2">
              <div className="flex flex-row gap-2 items-center">
                <span>Pending Deliveries: </span>
                {analyticsBacklogQuery.status === "pending" ? (
                  <Skeleton className="w-4 h-4" />
                ) : (
                  <span>{analyticsBacklogQuery.data.pendingDeliveries}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-row gap-2">
            <div className="flex flex-col gap-2">
              <div className="flex flex-row gap-2 items-center">
                <span>Next Due At: </span>
                {analyticsBacklogQuery.status === "pending" ? (
                  <Skeleton className="w-[10ch] h-4" />
                ) : (
                  <span>
                    {analyticsBacklogQuery.data.nextDueAt
                      ? new Intl.DateTimeFormat(undefined, {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(analyticsBacklogQuery.data.nextDueAt)
                      : "N/A"}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-row gap-2">
            <div className="flex flex-col gap-2">
              <div className="flex flex-row gap-2">
                <span>Oldest Age</span>
                {analyticsBacklogQuery.status === "pending" ? (
                  <Skeleton className="w-[10ch] h-4" />
                ) : (
                  <span>
                    {analyticsBacklogQuery.data.oldestAge
                      ? `${analyticsBacklogQuery.data.oldestAge}s`
                      : "N/A"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
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

function WebhookDeliveryAttemptsList({
  appId,
  webhookId,
}: {
  appId: string;
  webhookId: string;
}) {
  const deliveriesQuery = useWebhookDeliveryAttemptsQuery({ appId, webhookId });
  const columns = useMemo(
    () => createWebhookDeliveryAttemptsDataTableColumns(),
    [],
  );

  useProtectRoute(deliveriesQuery);

  if (deliveriesQuery.status === "pending") {
    // @todo loading screen
    return null;
  }

  if (deliveriesQuery.status === "error") {
    console.error(deliveriesQuery.error);

    return (
      <div className="rounded-lg border w-full">
        <ErrorScreen
          title="Error fetching deliveries"
          description="Please try again later. If the problem persists, please contact support."
          actions={
            <Button
              disabled={deliveriesQuery.isRefetching}
              onClick={() => deliveriesQuery.refetch()}
              className="gap-2"
            >
              <RotateCwIcon className="h-4 w-4" />
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  if (deliveriesQuery.data.results.length === 0) {
    return (
      <div className="rounded-lg border w-full">
        <EmptyScreen
          icon={<WebhookIcon />}
          title="No deliveries"
          description="There are no deliveries for this webhook yet"
        />
      </div>
    );
  }

  // @todo add pagination
  return <DataTable data={deliveriesQuery.data.results} columns={columns} />;
}

function createWebhookDeliveryAttemptsDataTableColumns(): ColumnDef<
  AppWebhookListDeliveryAttemptsResponseSchemaType["results"][number]
>[] {
  return [
    {
      header: "Attempted At",
      accessorKey: "attemptedAt",
      cell: ({ row }) => {
        return new Intl.DateTimeFormat(undefined, {
          dateStyle: "short",
          timeStyle: "short",
        }).format(row.original.attemptedAt);
      },
    },
    {
      header: "Attempt Number",
      accessorKey: "attemptNumber",
    },
    {
      header: "Event Type",
      accessorKey: "delivery.event.eventType",
      cell: ({ row }) => {
        return (
          <Badge variant="secondary">
            {row.original.delivery.event.eventType}
          </Badge>
        );
      },
    },
    {
      header: "Response Status",
      accessorKey: "responseStatus",
      cell: ({ row }) => {
        if (
          row.original.responseStatus >= 200 &&
          row.original.responseStatus <= 399
        ) {
          return <Badge variant="outline">{row.original.responseStatus}</Badge>;
        }

        if (row.original.responseStatus === -1) {
          return <Badge variant="destructive">Timeout</Badge>;
        }

        if (row.original.responseStatus === -2) {
          return <Badge variant="destructive">Network Error</Badge>;
        }

        return (
          <Badge variant="destructive">{row.original.responseStatus}</Badge>
        );
      },
    },
    {
      header: "Response Time",
      accessorKey: "responseMs",
      cell: ({ row }) => {
        return `${row.original.responseMs}ms`;
      },
    },
  ];
}
