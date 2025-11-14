import { useWebhookDeliveryQuery } from "@/queries/webhook";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import { ErrorScreen } from "../error-screen";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Separator } from "../ui/separator";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import {
  CheckIcon,
  CopyIcon,
  CircleAlertIcon,
  CheckCircle2Icon,
  HourglassIcon,
  Loader2Icon,
} from "lucide-react";

type DeliveryDetailSheetProps = {
  onOpenChange: (open: boolean) => void;
  deliveryId: string;
  appId: string;
  webhookId: string;
};

function StatusBadge({
  status,
}: {
  status: "pending" | "processing" | "failed" | "success";
}) {
  switch (status) {
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
      status satisfies never;
      return (
        <Badge className="gap-2" variant="outline">
          {status}
        </Badge>
      );
  }
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-full" />
      </div>
      <Separator />
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}

export function DeliveryDetailSheet(props: DeliveryDetailSheetProps) {
  const deliveryQuery = useWebhookDeliveryQuery({
    appId: props.appId,
    webhookId: props.webhookId,
    deliveryId: props.deliveryId,
  });
  const copyToClipboard = useCopyToClipboard();

  const handleCopyPayload = () => {
    if (deliveryQuery.status === "success") {
      copyToClipboard.copyToClipboard(
        JSON.stringify(deliveryQuery.data.event.payload, null, 2),
      );
    }
  };

  return (
    <Sheet open onOpenChange={props.onOpenChange}>
      <SheetContent className="sm:max-w-[700px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Delivery Detail</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          {deliveryQuery.status === "pending" && <LoadingSkeleton />}
          {deliveryQuery.status === "error" && (
            <ErrorScreen
              title="Error fetching delivery"
              description="Please try again later. If the problem persists, please contact support."
              actions={
                <Button type="button" onClick={() => deliveryQuery.refetch()}>
                  Retry
                </Button>
              }
            />
          )}
          {deliveryQuery.status === "success" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DetailRow
                    label="Created At"
                    value={new Intl.DateTimeFormat(undefined, {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(deliveryQuery.data.createdAt)}
                  />
                  <DetailRow
                    label="Next Attempt At"
                    value={
                      deliveryQuery.data.status === "pending"
                        ? new Intl.DateTimeFormat(undefined, {
                            dateStyle: "short",
                            timeStyle: "short",
                          }).format(deliveryQuery.data.nextAttemptAt)
                        : "-"
                    }
                  />
                  <DetailRow
                    label="Attempts Count"
                    value={deliveryQuery.data.attemptsCount}
                  />
                  <DetailRow
                    label="Status"
                    value={<StatusBadge status={deliveryQuery.data.status} />}
                  />
                  <DetailRow
                    label="Event Type"
                    value={
                      <Badge variant="secondary">
                        {deliveryQuery.data.event.eventType}
                      </Badge>
                    }
                  />
                  <DetailRow
                    label="Event UID"
                    value={
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {deliveryQuery.data.event.eventUid}
                      </code>
                    }
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle>Payload Preview</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyPayload}
                    className="gap-2"
                  >
                    {copyToClipboard.isCopied === "success" ? (
                      <CheckIcon className="h-4 w-4" />
                    ) : (
                      <CopyIcon className="h-4 w-4" />
                    )}
                    {copyToClipboard.isCopied === "success" ? "Copied" : "Copy"}
                  </Button>
                </CardHeader>
                <CardContent>
                  <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">
                    {JSON.stringify(deliveryQuery.data.event.payload, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
