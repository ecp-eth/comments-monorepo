"use client";

import type {
  AppSchemaType,
  AppWebhookListDeliveryAttemptsResponseSchemaType,
  AppWebhookSchemaType,
} from "@/api/schemas/apps";
import { BacklogSizeKpiCard } from "@/components/analytics/backlog-size-kpi-card";
import { DeliveriesEventualSuccessKpiCard } from "@/components/analytics/deliveries-eventual-success-kpi-card";
import { DeliveriesFirstAttemptSuccessKpiCard } from "@/components/analytics/deliveries-first-attempt-success-kpi-card";
import { DeliveriesInMinuteKpiCard } from "@/components/analytics/deliveries-in-minute-kpi-card";
import { DeliveriesKpiCard } from "@/components/analytics/deliveries-kpi-card";
import { EndToEndLatencyKpiCard } from "@/components/analytics/end-to-end-latency-kpi-card";
import { AppContent } from "@/components/app-content";
import { AppHeader } from "@/components/app-header";
import { AppWebhookDetailsAuthForm } from "@/components/app-webhook-details-auth-form";
import { AppWebhookDetailsDeleteButton } from "@/components/app-webhook-details-delete-button";
import { AppWebhookDetailsEventsForm } from "@/components/app-webhook-details-events-form";
import { AppWebhookDetailsRenameForm } from "@/components/app-webhook-details-rename-form";
import { AppWebhookDetailsTestButton } from "@/components/app-webhook-details-test-button";
import { AppWebhookDetailsUrlForm } from "@/components/app-webhook-details-url-form";
import { DataTable } from "@/components/data-table";
import { DataTableCursorPagination } from "@/components/data-table-cursor-pagination";
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
  useWebhookDeliveryAttemptsQuery,
  useWebhookQuery,
} from "@/queries/webhook";
import { keepPreviousData } from "@tanstack/react-query";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
  RotateCwIcon,
  WebhookIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
} from "lucide-react";
import Link from "next/link";
import { use, useMemo, useState } from "react";

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
        <AppContent className="flex-col gap-4">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3 w-full">
            <Skeleton className="w-full h-full aspect-video rounded-xl" />
            <Skeleton className="w-full h-full aspect-video rounded-xl" />
            <Skeleton className="w-full h-full aspect-video rounded-xl" />
            <Skeleton className="w-full h-full aspect-video rounded-xl" />
          </div>
          <div className="flex flex-col flex-1 gap-4">
            <h2 className="text-lg font-medium">Deliveries</h2>
            <Skeleton className="w-full h-full rounded-xl aspect-video" />
          </div>
        </AppContent>
      </>
    );
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
        <AppContent className="flex-col gap-4">
          <ErrorScreen
            title="Webhook not found"
            description="The webhook you are looking for does not exist."
            actions={
              <Button asChild>
                <Link href={`/apps/${appId}`}>Go back</Link>
              </Button>
            }
          />
        </AppContent>
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
        <AppContent className="flex-col gap-4">
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
        </AppContent>
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
        <AppContent className="flex-col gap-4">
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
        </AppContent>
      </>
    );
  }

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
          <div className="grid auto-rows-mini gap-4">
            <DeliveriesKpiCard appId={appId} webhookId={webhookId} />
            <EndToEndLatencyKpiCard appId={appId} webhookId={webhookId} />
            <BacklogSizeKpiCard appId={appId} webhookId={webhookId} />
          </div>
          <div className="grid auto-rows-mini gap-4">
            <DeliveriesFirstAttemptSuccessKpiCard
              appId={appId}
              webhookId={webhookId}
            />
            <DeliveriesEventualSuccessKpiCard
              appId={appId}
              webhookId={webhookId}
            />
            <DeliveriesInMinuteKpiCard appId={appId} webhookId={webhookId} />
          </div>
        </div>
        <div className="flex flex-col flex-1 gap-4">
          <h2 className="text-lg font-medium">Deliveries</h2>
          <WebhookDeliveryAttemptsList appId={appId} webhookId={webhookId} />
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

function WebhookDeliveryAttemptsList({
  appId,
  webhookId,
}: {
  appId: string;
  webhookId: string;
}) {
  const [paginationParams, setPaginationParams] = useState<
    | {
        direction: "previous" | "next";
        cursor: string;
      }
    | undefined
  >(undefined);
  const [paginationState, setPaginationState] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const deliveriesQuery = useWebhookDeliveryAttemptsQuery({
    refetchOnMount: true,
    appId,
    webhookId,
    placeholderData: keepPreviousData,
    limit: paginationState.pageSize,
    page: paginationParams,
  });
  const columns = useMemo(
    () => createWebhookDeliveryAttemptsDataTableColumns(),
    [],
  );

  useProtectRoute(deliveriesQuery);

  if (deliveriesQuery.status === "pending") {
    return <Skeleton className="w-full h-full rounded-xl aspect-video" />;
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

  return (
    <DataTable
      data={deliveriesQuery.data.results}
      columns={columns}
      pagination={() => {
        return {
          render(props) {
            return (
              <DataTableCursorPagination
                {...props}
                hasNextPage={deliveriesQuery.data.pageInfo.hasNextPage}
                hasPreviousPage={deliveriesQuery.data.pageInfo.hasPreviousPage}
                onNextPage={() => {
                  if (deliveriesQuery.data.pageInfo.endCursor) {
                    setPaginationParams({
                      direction: "next",
                      cursor: deliveriesQuery.data.pageInfo.endCursor,
                    });
                  }
                }}
                onPreviousPage={() => {
                  if (deliveriesQuery.data.pageInfo.startCursor) {
                    setPaginationParams({
                      direction: "previous",
                      cursor: deliveriesQuery.data.pageInfo.startCursor,
                    });
                  }
                }}
              />
            );
          },
          state: paginationState,
          onPaginationChange: setPaginationState,
        };
      }}
    />
  );
}

function createWebhookDeliveryAttemptsDataTableColumns(): ColumnDef<
  AppWebhookListDeliveryAttemptsResponseSchemaType["results"][number]
>[] {
  return [
    {
      header: "Attempted At",
      accessorKey: "item.attemptedAt",
      cell: ({ row }) => {
        return new Intl.DateTimeFormat(undefined, {
          dateStyle: "short",
          timeStyle: "short",
        }).format(row.original.item.attemptedAt);
      },
    },
    {
      header: "Attempt Number",
      accessorKey: "item.attemptNumber",
    },
    {
      header: "Event Type",
      accessorKey: "item.delivery.event.eventType",
      cell: ({ row }) => {
        return (
          <Badge variant="secondary">
            {row.original.item.delivery.event.eventType}
          </Badge>
        );
      },
    },
    {
      header: "Response Status",
      accessorKey: "item.responseStatus",
      cell: ({ row }) => {
        if (
          row.original.item.responseStatus >= 200 &&
          row.original.item.responseStatus <= 399
        ) {
          return (
            <Badge className="gap-2" variant="outline">
              <CheckCircle2Icon className="h-4 w-4 text-green-400" />
              {row.original.item.responseStatus}
            </Badge>
          );
        }

        if (row.original.item.responseStatus === -1) {
          return (
            <Badge className="gap-2" variant="outline">
              <CircleAlertIcon className="h-4 w-4 text-red-400" />
              Timeout
            </Badge>
          );
        }

        if (row.original.item.responseStatus === -2) {
          return (
            <Badge className="gap-2" variant="outline">
              <CircleAlertIcon className="h-4 w-4 text-red-400" />
              Network Error
            </Badge>
          );
        }

        return (
          <Badge className="gap-2" variant="outline">
            <CircleAlertIcon className="h-4 w-4 text-red-400" />
            {row.original.item.responseStatus}
          </Badge>
        );
      },
    },
    {
      header: "Response Time",
      accessorKey: "item.responseMs",
      cell: ({ row }) => {
        return row.original.item.responseMs.toLocaleString(undefined, {
          unit: "millisecond",
          style: "unit",
        });
      },
    },
  ];
}
