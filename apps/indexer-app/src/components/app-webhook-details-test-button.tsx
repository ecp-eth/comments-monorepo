import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Loader2Icon, PlayCircleIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./ui/drawer";
import type { AppSchemaType, AppWebhookSchemaType } from "@/api/schemas/apps";
import { useSendTestWebhookEventMutation } from "@/mutations/webhooks";

export function AppWebhookDetailsTestButton({
  app,
  webhook,
}: {
  app: AppSchemaType;
  webhook: AppWebhookSchemaType;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const sendTestWebhookEventMutation = useSendTestWebhookEventMutation({
    appId: app.id,
    webhookId: webhook.id,
    onSuccess() {
      toast.success("Webhook test event queued successfully");
      setIsOpen(false);
    },
    onError(error) {
      console.error(error);
      toast.error("Failed to queue webhook test event");
    },
  });
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerTrigger asChild>
          <Button className="gap-2" variant="secondary">
            <PlayCircleIcon className="h-4 w-4" />
            <span>Test Event</span>
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Send Test Event</DrawerTitle>
            <DrawerDescription>
              Are you sure you want to send a test event to this webhook?
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <Button
              className="gap-2"
              disabled={sendTestWebhookEventMutation.isPending}
              type="button"
              onClick={() => sendTestWebhookEventMutation.mutate()}
            >
              {sendTestWebhookEventMutation.isPending ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                "Send"
              )}
            </Button>
            <Button
              disabled={sendTestWebhookEventMutation.isPending}
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (sendTestWebhookEventMutation.isPending) {
          return;
        }

        setIsOpen(open);
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2" variant="secondary">
          <PlayCircleIcon className="h-4 w-4" />
          <span>Test Event</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Test Event</DialogTitle>
          <DialogDescription>
            Are you sure you want to send a test event to this webhook?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            disabled={sendTestWebhookEventMutation.isPending}
            variant="outline"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button
            className="gap-2"
            disabled={sendTestWebhookEventMutation.isPending}
            type="button"
            onClick={() => sendTestWebhookEventMutation.mutate()}
          >
            {sendTestWebhookEventMutation.isPending ? (
              <>
                <Loader2Icon className="h-4 w-4 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              "Send"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
