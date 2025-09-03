"use client";

import { AppHeader } from "@/components/app-header";
import { AppContent } from "@/components/app-content";
import { ErrorScreen } from "@/components/error-screen";
import { AppNotFoundError } from "@/errors";
import { useAppQuery } from "@/queries/app";
import { use, useMemo } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useMeQuery } from "@/queries/me";
import { useProtectRoute } from "@/hooks/use-protect-route";
import { RotateCwIcon, WebhookIcon } from "lucide-react";
import { useWebhooksQuery } from "@/queries/webhooks";
import { EmptyScreen } from "@/components/empty-screen";
import { CreateWebhookDialogButton } from "@/components/create-webhook-dialog-button";
import { DataTable } from "@/components/data-table";
import { AppWebhooksListResponseSchemaType } from "@/api/schemas/apps";
import { ColumnDef } from "@tanstack/react-table";

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

  if (meQuery.status === "pending") {
    // @todo loading screen
    return null;
  }

  if (meQuery.status === "error") {
    console.error(meQuery.error);

    return (
      <>
        <AppHeader breadcrumbs={[{ label: "Apps", href: "/apps" }]} />
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
      </>
    );
  }

  if (appQuery.status === "pending") {
    // @todo loading screen
    return null;
  }

  if (
    appQuery.status === "error" &&
    appQuery.error instanceof AppNotFoundError
  ) {
    return (
      <>
        <AppHeader breadcrumbs={[{ label: "Apps", href: "/apps" }]} />
        <ErrorScreen
          title="App not found"
          description="The app you are looking for does not exist."
          actions={
            <Button asChild>
              <Link href="/apps">Go back</Link>
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
        <AppHeader breadcrumbs={[{ label: "Apps", href: "/apps" }]} />
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

  // @todo render app details + statistics + webhooks

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
          <div className="bg-muted/50 aspect-video rounded-xl" />
          <div className="bg-muted/50 aspect-video rounded-xl" />
          <div className="bg-muted/50 aspect-video rounded-xl" />
        </div>
        <div className="flex flex-col flex-1 gap-4">
          <h2 className="text-lg font-medium">Webhooks</h2>
          <WebhooksList appId={appId} />
        </div>
      </AppContent>
    </>
  );
}

function WebhooksList({ appId }: { appId: string }) {
  const webhooksQuery = useWebhooksQuery({ appId });
  const columns = useMemo(
    () => createWebhooksDataTableColumns({ appId }),
    [appId],
  );

  if (webhooksQuery.status === "pending") {
    // @todo loading screen
    return null;
  }

  if (webhooksQuery.status === "error") {
    console.error(webhooksQuery.error);

    return (
      <ErrorScreen
        title="Error fetching webhooks"
        description="Please try again later. If the problem persists, please contact support."
        actions={
          <Button
            disabled={webhooksQuery.isRefetching}
            onClick={() => webhooksQuery.refetch()}
            className="gap-2"
          >
            <RotateCwIcon className="h-4 w-4" />
            Retry
          </Button>
        }
      />
    );
  }

  if (webhooksQuery.data.results.length === 0) {
    return (
      <EmptyScreen
        icon={<WebhookIcon />}
        title="No webhooks"
        description="You don't have any webhooks yet"
        actions={<CreateWebhookDialogButton appId={appId} />}
      />
    );
  }

  return (
    <DataTable
      data={webhooksQuery.data.results}
      columns={columns}
      tableActions={<CreateWebhookDialogButton appId={appId} />}
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
