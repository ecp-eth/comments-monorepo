"use client";

import { BacklogSizeKpiCard } from "@/components/analytics/backlog-size-kpi-card";
import { DeliveriesEventualSuccessKpiCard } from "@/components/analytics/deliveries-eventual-success-kpi-card";
import { DeliveriesFirstAttemptSuccessKpiCard } from "@/components/analytics/deliveries-first-attempt-success-kpi-card";
import { DeliveriesInMinuteKpiCard } from "@/components/analytics/deliveries-in-minute-kpi-card";
import { DeliveriesKpiCard } from "@/components/analytics/deliveries-kpi-card";
import { EndToEndLatencyKpiCard } from "@/components/analytics/end-to-end-latency-kpi-card";
import { AppContent } from "@/components/app-content";
import { AppHeader } from "@/components/app-header";
import { ErrorScreen } from "@/components/error-screen";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WebhookNotFoundError } from "@/errors";
import { useProtectRoute } from "@/hooks/use-protect-route";
import { useAppQuery } from "@/queries/app";
import { useWebhookQuery } from "@/queries/webhook";
import { RotateCwIcon, InfoIcon } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";
import { WebhookDetailsCard } from "./webhook-details-card";
import { WebhookDeliveriesTable } from "./webhook-deliveries-table";
import { WebhookDeliveryAttemptsList } from "./webhook-delivery-attempts-table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function WebhookPage({
  params,
}: {
  params: Promise<{ appId: string; webhookId: string }>;
}) {
  const { appId, webhookId } = use(params);
  const appQuery = useAppQuery({ appId });
  const webhookQuery = useWebhookQuery({ appId, webhookId });
  const [
    viewDeliveryAttemptsForDeliveryId,
    setViewDeliveryAttemptsForDeliveryId,
  ] = useState<string | undefined>();

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
          <h2 className="text-lg font-medium flex items-center gap-2">
            Deliveries
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="About deliveries"
                  className="p-0 m-0 inline-flex"
                >
                  <InfoIcon className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Deliveries are top level object representing a delivery of a
                  webhook. They consist of at least one delivery attempt.
                </p>
              </TooltipContent>
            </Tooltip>
          </h2>
          <WebhookDeliveriesTable
            appId={appId}
            webhookId={webhookId}
            onViewDeliveryAttempts={setViewDeliveryAttemptsForDeliveryId}
          />

          <h2 className="text-lg font-medium flex items-center gap-2">
            Delivery attempts
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="About delivery attempts"
                  className="p-0 m-0 inline-flex"
                >
                  <InfoIcon className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Delivery attempts are the attempts made to deliver the
                  webhook. This is a detailed table of all the attempts made for
                  each webhook delivery.
                </p>
              </TooltipContent>
            </Tooltip>
          </h2>
          <WebhookDeliveryAttemptsList
            appId={appId}
            webhookId={webhookId}
            deliveryId={viewDeliveryAttemptsForDeliveryId}
            onClearDeliveryId={() =>
              setViewDeliveryAttemptsForDeliveryId(undefined)
            }
          />
        </div>
      </AppContent>
    </>
  );
}
