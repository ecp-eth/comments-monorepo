"use client";

import { RotateCwIcon, TerminalSquareIcon } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { AppContent } from "@/components/app-content";
import { useAppsQuery } from "@/queries/apps";
import { useMeQuery } from "@/queries/me";
import { EmptyScreen } from "@/components/empty-screen";
import { Button } from "@/components/ui/button";
import { useProtectRoute } from "@/hooks/use-protect-route";
import { ErrorScreen } from "@/components/error-screen";
import { cn } from "@/lib/utils";
import { DataTable } from "@/components/data-table";
import type { ListAppsResponseSchemaType } from "@/api/schemas/apps";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import Link from "next/link";
import { CreateAppDialogButton } from "@/components/create-app-dialog-button";
import { useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { DataTableBasicPagination } from "@/components/data-table-basic-pagination";
import { Skeleton } from "@/components/ui/skeleton";

export default function AppsPage() {
  const [paginationState, setPaginationState] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const meQuery = useMeQuery();
  const appsQuery = useAppsQuery({
    refetchOnMount: true,
    placeholderData: keepPreviousData,
    page: paginationState.pageIndex + 1,
    limit: paginationState.pageSize,
  });

  useProtectRoute(meQuery);
  useProtectRoute(appsQuery);

  if (meQuery.status === "pending") {
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

  if (appsQuery.status === "pending") {
    return (
      <>
        <AppHeader breadcrumbs={[{ label: "Apps", href: "/apps" }]} />
        <AppContent className="flex-col gap-4">
          <Skeleton className="w-full h-full rounded-xl" />
        </AppContent>
      </>
    );
  }

  if (appsQuery.status === "error") {
    console.error(appsQuery.error);

    return (
      <>
        <AppHeader breadcrumbs={[{ label: "Apps", href: "/apps" }]} />
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

  return (
    <>
      <AppHeader breadcrumbs={[{ label: "Apps", href: "/apps" }]} />
      <AppContent className="flex-col gap-4">
        {appsQuery.data.results.length === 0 ? (
          <EmptyScreen
            icon={<TerminalSquareIcon />}
            title="No apps"
            description="You don't have any apps yet"
            actions={<CreateAppDialogButton />}
          />
        ) : (
          <DataTable
            data={appsQuery.data.results}
            columns={columns}
            tableActions={<CreateAppDialogButton />}
            pagination={() => {
              return {
                render(props) {
                  return <DataTableBasicPagination {...props} />;
                },
                paginationRowCount: appsQuery.data.pageInfo.total,
                onPaginationChange: setPaginationState,
                state: paginationState,
              };
            }}
          />
        )}
      </AppContent>
    </>
  );
}

const columns: ColumnDef<ListAppsResponseSchemaType["results"][number]>[] = [
  {
    header: "Name",
    accessorKey: "name",
    cell: ({ row }) => {
      return (
        <Button asChild variant="link">
          <Link href={`/apps/${row.original.id}`}>{row.original.name}</Link>
        </Button>
      );
    },
  },
  {
    header: "Created At",
    accessorKey: "createdAt",
    cell: ({ row }) => {
      return (
        <span>
          {new Intl.DateTimeFormat(undefined, {
            dateStyle: "short",
            timeStyle: "short",
          }).format(row.original.createdAt)}
        </span>
      );
    },
  },
  {
    header: "Updated At",
    accessorKey: "updatedAt",
    cell: ({ row }) => {
      return (
        <span>
          {new Intl.DateTimeFormat(undefined, {
            dateStyle: "short",
            timeStyle: "short",
          }).format(row.original.updatedAt)}
        </span>
      );
    },
  },
];
