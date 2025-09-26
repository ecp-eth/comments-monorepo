"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { useRetryWebhookDeliveryMutation } from "@/mutations/webhooks";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../ui/drawer";
import { KnownMutationError } from "@/errors";
import { useQueryClient } from "@tanstack/react-query";

type RetryDeliveryDialogProps =
  | {
      isOpen: true;
      deliveryId: string;
      appId: string;
      webhookId: string;
      onClose: () => void;
    }
  | {
      isOpen: false;
      appId: string;
      webhookId: string;
    };

export function RetryDeliveryDialog(props: RetryDeliveryDialogProps) {
  const queryClient = useQueryClient();
  const { appId, webhookId, isOpen } = props;
  const isMobile = useIsMobile();
  const retryDeliveryMutation = useRetryWebhookDeliveryMutation({
    appId,
    webhookId,
    onSuccess() {
      toast.success("Delivery queued for retry successfully");

      if (props.isOpen) {
        props.onClose();
      }

      queryClient.refetchQueries({
        queryKey: ["webhook-deliveries", appId, webhookId],
      });
    },
    onError(error) {
      if (error instanceof KnownMutationError) {
        toast.error(error.message);
      } else {
        console.error(error);
        toast.error("Failed to queue delivery for retry");
      }
    },
  });

  const handleClose = () => {
    if (retryDeliveryMutation.isPending) {
      return;
    }

    if (props.isOpen) {
      props.onClose();
    }
  };

  const handleRetry = () => {
    if (!props.isOpen) {
      return;
    }

    if (retryDeliveryMutation.isPending) {
      return;
    }

    retryDeliveryMutation.mutate(props.deliveryId);
  };

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={handleClose}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Retry Delivery</DrawerTitle>
            <DrawerDescription>
              Are you sure you want to retry this delivery?
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <Button
              className="gap-2"
              disabled={retryDeliveryMutation.isPending}
              onClick={handleRetry}
            >
              {retryDeliveryMutation.isPending ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  <span>Queueing...</span>
                </>
              ) : (
                "Retry"
              )}
            </Button>
            <Button
              disabled={retryDeliveryMutation.isPending}
              variant="outline"
              onClick={handleClose}
            >
              Cancel
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Retry Delivery</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Are you sure you want to retry this delivery?
        </DialogDescription>
        <DialogFooter>
          <Button
            disabled={retryDeliveryMutation.isPending}
            variant="outline"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            disabled={retryDeliveryMutation.isPending}
            onClick={handleRetry}
          >
            {retryDeliveryMutation.isPending ? (
              <>
                <Loader2Icon className="h-4 w-4 animate-spin" />
                <span>Queueing...</span>
              </>
            ) : (
              "Retry"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
