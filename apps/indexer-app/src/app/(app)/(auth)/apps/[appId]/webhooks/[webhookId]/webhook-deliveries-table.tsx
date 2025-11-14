"use client";

import { DataTable } from "@/components/data-table";
import { DataTableCursorPagination } from "@/components/data-table-cursor-pagination";
import { EmptyScreen } from "@/components/empty-screen";
import { ErrorScreen } from "@/components/error-screen";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RetryDeliveryDialog } from "@/components/webhook-deliveries-table/retry-delivery-dialog";
import { useProtectRoute } from "@/hooks/use-protect-route";
import { useWebhookDeliveriesQuery } from "@/queries/webhook";
import { keepPreviousData } from "@tanstack/react-query";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
  RotateCwIcon,
  WebhookIcon,
  EyeIcon,
  CircleAlertIcon,
  CheckCircle2Icon,
  HourglassIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  RefreshCwIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { AppWebhookListDeliveriesResponseSchemaType } from "../../../../../../../api/schemas/apps";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { DeliveryDetailSheet } from "@/components/webhook-deliveries-table/delivery-detail-sheet";

export function WebhookDeliveriesTable({
  appId,
  webhookId,
  onViewDeliveryAttempts,
}: {
  appId: string;
  webhookId: string;
  onViewDeliveryAttempts: (deliveryId: string) => void;
}) {
  const [
    retryDeliveryDialogOpenForDeliveryId,
    setRetryDeliveryDialogOpenForDeliveryId,
  ] = useState<string | null>(null);
  const [viewDeliveryDetailForDeliveryId, setViewDeliveryDetailForDeliveryId] =
    useState<string | null>(null);
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
  const deliveriesQuery = useWebhookDeliveriesQuery({
    refetchOnMount: true,
    appId,
    webhookId,
    placeholderData: keepPreviousData,
    limit: paginationState.pageSize,
    page: paginationParams,
  });
  const columns = useMemo(
    () =>
      createWebhookDeliveryAttemptsDataTableColumns({
        onRetryDelivery: setRetryDeliveryDialogOpenForDeliveryId,
        onViewDeliveryAttempts,
        onViewDeliveryDetail: setViewDeliveryDetailForDeliveryId,
      }),
    [onViewDeliveryAttempts],
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
    <>
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
                  hasPreviousPage={
                    deliveriesQuery.data.pageInfo.hasPreviousPage
                  }
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
      <RetryDeliveryDialog
        appId={appId}
        webhookId={webhookId}
        {...(retryDeliveryDialogOpenForDeliveryId
          ? {
              isOpen: true,
              deliveryId: retryDeliveryDialogOpenForDeliveryId,
              onClose: () => setRetryDeliveryDialogOpenForDeliveryId(null),
            }
          : {
              isOpen: false,
            })}
      />
      {viewDeliveryDetailForDeliveryId && (
        <DeliveryDetailSheet
          appId={appId}
          webhookId={webhookId}
          deliveryId={viewDeliveryDetailForDeliveryId}
          onOpenChange={() => setViewDeliveryDetailForDeliveryId(null)}
        />
      )}
    </>
  );
}

function createWebhookDeliveryAttemptsDataTableColumns({
  onRetryDelivery,
  onViewDeliveryAttempts,
  onViewDeliveryDetail,
}: {
  onRetryDelivery: (deliveryId: string) => void;
  onViewDeliveryAttempts: (deliveryId: string) => void;
  onViewDeliveryDetail: (deliveryId: string) => void;
}): ColumnDef<AppWebhookListDeliveriesResponseSchemaType["results"][number]>[] {
  return [
    {
      id: "createdAt",
      header: () => <span className="whitespace-nowrap">Created at</span>,
      cell: ({ row }) => {
        return new Intl.DateTimeFormat(undefined, {
          dateStyle: "short",
          timeStyle: "short",
        }).format(row.original.item.createdAt);
      },
    },
    {
      id: "eventType",
      header: () => <span className="whitespace-nowrap">Event type</span>,
      cell: ({ row }) => {
        return (
          <Badge variant="secondary">{row.original.item.event.eventType}</Badge>
        );
      },
    },
    {
      id: "attemptsCount",
      header: () => <span className="whitespace-nowrap">Attempts count</span>,
      cell: ({ row }) => {
        return <span>{row.original.item.attemptsCount}</span>;
      },
    },
    {
      id: "status",
      header: () => <span className="whitespace-nowrap">Status</span>,
      cell: ({ row }) => {
        switch (row.original.item.status) {
          case "failed":
            return (
              <Badge className="gap-2" variant="outline">
                <CircleAlertIcon className="h-4 w-4 text-red-400" />
                Failed
              </Badge>
            );
          case "success":
            return (
              <Badge className="gap-2" variant="outline">
                <CheckCircle2Icon className="h-4 w-4 text-green-400" />
                Success
              </Badge>
            );
          case "pending":
            return (
              <Badge className="gap-2" variant="outline">
                <HourglassIcon className="h-4 w-4" />
                Pending
              </Badge>
            );
          case "processing":
            return (
              <Badge className="gap-2" variant="outline">
                <Loader2Icon className="h-4 w-4 animate-spin" />
                Processing
              </Badge>
            );
          default:
            row.original.item.status satisfies never;
            return (
              <Badge className="gap-2" variant="outline">
                {row.original.item.status}
              </Badge>
            );
        }
      },
    },
    {
      id: "nextAttemptedAt",
      header: () => <span className="whitespace-nowrap">Next attempt at</span>,
      cell: ({ row }) => {
        if (
          row.original.item.status !== "success" &&
          row.original.item.status !== "failed"
        ) {
          return new Intl.DateTimeFormat(undefined, {
            dateStyle: "short",
            timeStyle: "short",
          }).format(row.original.item.nextAttemptAt);
        }

        return <span>-</span>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        return (
          <span className="flex flex-row">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-2 md:hidden" variant="ghost" size="sm">
                  <MoreHorizontalIcon className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {row.original.item.status === "failed" && (
                  <DropdownMenuItem
                    onClick={() =>
                      onRetryDelivery(row.original.item.id.toString())
                    }
                  >
                    <RotateCwIcon className="h-4 w-4" />
                    <span>Retry</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() =>
                    onViewDeliveryAttempts(row.original.item.id.toString())
                  }
                >
                  <EyeIcon className="h-4 w-4" />
                  <span>View attempts</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    onViewDeliveryDetail(row.original.item.id.toString())
                  }
                >
                  <EyeIcon className="h-4 w-4" />
                  <span>View detail</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {row.original.item.status === "failed" && (
              <Button
                className="gap-2 hidden md:inline-flex"
                variant="ghost"
                size="sm"
                onClick={() => onRetryDelivery(row.original.item.id.toString())}
              >
                <RefreshCwIcon className="h-4 w-4" />
                <span>Retry</span>
              </Button>
            )}

            <Button
              className="gap-2 hidden md:inline-flex"
              variant="ghost"
              size="sm"
              onClick={() =>
                onViewDeliveryAttempts(row.original.item.id.toString())
              }
            >
              <EyeIcon className="h-4 w-4" />
              <span>View attempts</span>
            </Button>

            <Button
              className="gap-2 hidden md:inline-flex"
              variant="ghost"
              size="sm"
              onClick={() =>
                onViewDeliveryDetail(row.original.item.id.toString())
              }
            >
              <EyeIcon className="h-4 w-4" />
              <span>View detail</span>
            </Button>
          </span>
        );
      },
    },
  ];
}
