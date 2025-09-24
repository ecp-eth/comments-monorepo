"use client";

import { useWebhookDeliveryAttemptsQuery } from "@/queries/webhook";
import { keepPreviousData } from "@tanstack/react-query";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorScreen } from "@/components/error-screen";
import { Button } from "@/components/ui/button";
import { useProtectRoute } from "@/hooks/use-protect-route";
import {
  CheckCircle2Icon,
  CircleAlertIcon,
  RotateCwIcon,
  WebhookIcon,
  XIcon,
} from "lucide-react";
import { EmptyScreen } from "@/components/empty-screen";
import { Badge } from "@/components/ui/badge";
import type { AppWebhookListDeliveryAttemptsResponseSchemaType } from "@/api/schemas/apps";
import { DataTable } from "@/components/data-table";
import { DataTableCursorPagination } from "@/components/data-table-cursor-pagination";

export function WebhookDeliveryAttemptsList({
  appId,
  webhookId,
  deliveryId,
  onClearDeliveryId,
}: {
  appId: string;
  webhookId: string;
  /**
   * Filter attempts by delivery ID
   */
  deliveryId?: string;
  onClearDeliveryId: () => void;
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
    deliveryId,
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
      <>
        {deliveryId && (
          <div className="flex flex-row">
            <Badge variant="secondary">Delivery {deliveryId}</Badge>
          </div>
        )}
        <div className="rounded-lg border w-full">
          <EmptyScreen
            icon={<WebhookIcon />}
            title="No deliveries"
            description="There are no deliveries for this webhook yet"
          />
        </div>
      </>
    );
  }

  return (
    <>
      <DataTable
        data={deliveriesQuery.data.results}
        columns={columns}
        tableFilters={
          deliveryId ? (
            <section className="flex flex-row gap-2 items-center">
              <h3 className="font-medium text-sm">Applied filters: </h3>
              <Badge className="gap-2" variant="secondary">
                <span>Delivery #{deliveryId}</span>
                <Button
                  className="p-0 m-0 text-xs h-4"
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={onClearDeliveryId}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </Badge>
            </section>
          ) : undefined
        }
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
    </>
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
