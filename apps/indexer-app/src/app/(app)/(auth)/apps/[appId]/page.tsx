"use client";

import { AppHeader } from "@/components/app-header";
import { AppContent } from "@/components/app-content";
import { ErrorScreen } from "@/components/error-screen";
import { AppNotFoundError } from "@/errors";
import { useAppQuery } from "@/queries/app";
import { use, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useMeQuery } from "@/queries/me";
import { useProtectRoute } from "@/hooks/use-protect-route";
import { RotateCwIcon, WebhookIcon } from "lucide-react";
import { useWebhooksQuery } from "@/queries/webhooks";
import { EmptyScreen } from "@/components/empty-screen";
import { CreateWebhookDialogButton } from "@/components/create-webhook-dialog-button";
import { DataTable } from "@/components/data-table";
import type { AppWebhooksListResponseSchemaType } from "@/api/schemas/apps";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type AppSchemaType } from "@/api/schemas/apps";
import { AppDetailsSecretForm } from "@/components/app-details-secret-form";
import { AppDetailsRenameForm } from "@/components/app-details-rename-form";
import { AppDetailsDeleteButton } from "@/components/app-details-delete-button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableBasicPagination } from "@/components/data-table-basic-pagination";
import { cn } from "@/lib/utils";
import { DeliveriesKpiCard } from "@/components/analytics/deliveries-kpi-card";
import { EndToEndLatencyKpiCard } from "@/components/analytics/end-to-end-latency-kpi-card";
import { DeliveriesFirstAttemptSuccessKpiCard } from "@/components/analytics/deliveries-first-attempt-success-kpi-card";
import { DeliveriesEventualSuccessKpiCard } from "@/components/analytics/deliveries-eventual-success-kpi-card";

export default function AppPage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId } = use(params);
  const meQuery = useMeQuery();
  const appQuery = useAppQuery({ appId, refetchOnMount: true });

  useProtectRoute(meQuery);
  useProtectRoute(appQuery);

  if (meQuery.status === "pending" || appQuery.status === "pending") {
    return (
      <>
        <AppHeader breadcrumbs={[{ label: "Apps", href: "/apps" }]} />
        <AppContent className="flex-col gap-4">
          <Skeleton className="w-full h-full rounded-xl" />
        </AppContent>
      </>
    );
  }

  if (meQuery.status === "error") {
    console.error(meQuery.error);

    return (
      <>
        <AppHeader breadcrumbs={[{ label: "Apps", href: "/apps" }]} />
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
                <RotateCwIcon className="h-4 w-4" />
                Retry
              </Button>
            }
          />
        </AppContent>
      </>
    );
  }

  if (
    appQuery.status === "error" &&
    appQuery.error instanceof AppNotFoundError
  ) {
    return (
      <>
        <AppHeader breadcrumbs={[{ label: "Apps", href: "/apps" }]} />
        <AppContent className="flex-col gap-4">
          <ErrorScreen
            title="App not found"
            description="The app you are looking for does not exist."
            actions={
              <Button asChild>
                <Link href="/apps">Go back</Link>
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
        <AppHeader breadcrumbs={[{ label: "Apps", href: "/apps" }]} />
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
          { label: appQuery.data.name, href: `/apps/${appId}` },
        ]}
      />
      <AppContent className="flex-col gap-4">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3 w-full">
          <AppDetailsCard app={appQuery.data} />
          <div className="flex flex-col gap-4">
            <DeliveriesKpiCard appId={appId} />
            <EndToEndLatencyKpiCard appId={appId} />
          </div>
          <div className="flex flex-col gap-4">
            <DeliveriesFirstAttemptSuccessKpiCard appId={appId} />
            <DeliveriesEventualSuccessKpiCard />
          </div>
        </div>
        <div className="flex flex-col flex-1 gap-4">
          <h2 className="text-lg font-medium">Webhooks</h2>
          <WebhooksList appId={appId} />
        </div>
      </AppContent>
    </>
  );
}

function AppDetailsCard({ app }: { app: AppSchemaType }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>App Details</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <AppDetailsRenameForm app={app} />
        <AppDetailsSecretForm app={app} />
        <div>
          <AppDetailsDeleteButton app={app} />
        </div>
      </CardContent>
    </Card>
  );
}

function WebhooksList({ appId }: { appId: string }) {
  const [paginationState, setPaginationState] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const webhooksQuery = useWebhooksQuery({
    appId,
    refetchOnMount: true,
    page: paginationState.pageIndex + 1,
    limit: paginationState.pageSize,
  });
  const columns = useMemo(
    () => createWebhooksDataTableColumns({ appId }),
    [appId],
  );

  useProtectRoute(webhooksQuery);

  if (webhooksQuery.status === "pending") {
    return <Skeleton className="w-full border rounded-xl aspect-video" />;
  }

  if (webhooksQuery.status === "error") {
    console.error(webhooksQuery.error);

    return (
      <div className="rounded-lg border w-full">
        <ErrorScreen
          title="Error fetching webhooks"
          description="Please try again later. If the problem persists, please contact support."
          actions={
            <Button
              disabled={webhooksQuery.isRefetching}
              onClick={() => webhooksQuery.refetch()}
              className="gap-2"
            >
              <RotateCwIcon
                className={cn(
                  "h-4 w-4",
                  webhooksQuery.isRefetching && "animate-spin",
                )}
              />
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  if (webhooksQuery.data.results.length === 0) {
    return (
      <div className="rounded-lg border w-full">
        <EmptyScreen
          icon={<WebhookIcon />}
          title="No webhooks"
          description="You don't have any webhooks yet"
          actions={<CreateWebhookDialogButton appId={appId} />}
        />
      </div>
    );
  }

  return (
    <DataTable
      data={webhooksQuery.data.results}
      columns={columns}
      tableActions={<CreateWebhookDialogButton appId={appId} />}
      pagination={() => {
        return {
          render(props) {
            return <DataTableBasicPagination {...props} />;
          },
          paginationRowCount: webhooksQuery.data.pageInfo.total,
          onPaginationChange: setPaginationState,
          state: paginationState,
        };
      }}
    />
  );
}

function createWebhooksDataTableColumns({
  appId,
}: {
  appId: string;
}): ColumnDef<AppWebhooksListResponseSchemaType["results"][number]>[] {
  return [
    {
      header: "Name",
      accessorKey: "name",
      cell: ({ row }) => {
        return (
          <Button asChild variant="link">
            <Link href={`/apps/${appId}/webhooks/${row.original.id}`}>
              {row.original.name}
            </Link>
          </Button>
        );
      },
    },
    {
      header: "URL",
      accessorKey: "url",
      cell: ({ row }) => {
        return <span>{row.original.url}</span>;
      },
    },
  ];
}
