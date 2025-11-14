import { useWebhookDeliveryQuery } from "@/queries/webhook";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import { ErrorScreen } from "../error-screen";
import { Button } from "../ui/button";

type DeliveryDetailSheetProps = {
  onOpenChange: (open: boolean) => void;
  deliveryId: string;
  appId: string;
  webhookId: string;
};

export function DeliveryDetailSheet(props: DeliveryDetailSheetProps) {
  const deliveryQuery = useWebhookDeliveryQuery({
    appId: props.appId,
    webhookId: props.webhookId,
    deliveryId: props.deliveryId,
  });

  return (
    <Sheet open onOpenChange={props.onOpenChange}>
      <SheetContent className="sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle>Delivery Detail</SheetTitle>
        </SheetHeader>
        <div className="grid flex-1 auto-rows-min gap-6 px-4">
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
            <div>
              <pre className="overflow-x-auto">
                {JSON.stringify(deliveryQuery.data.event.payload, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
