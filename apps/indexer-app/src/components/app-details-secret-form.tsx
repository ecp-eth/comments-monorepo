import type { AppSchemaType } from "@/api/schemas/apps";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel } from "./ui/form";
import { Input } from "./ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Button } from "./ui/button";
import {
  CheckIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
  RotateCwIcon,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRefreshAppSecretMutation } from "@/mutations/apps";
import { toast } from "sonner";
import { createAppQueryKey } from "@/queries/query-keys";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "./ui/drawer";

export function AppDetailsSecretForm({ app }: { app: AppSchemaType }) {
  const copySecret = useCopyToClipboard();
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isSecretShown, setIsSecretShown] = useState(false);
  const form = useForm({
    defaultValues: {
      secret: app.secret,
    },
  });

  useEffect(() => {
    form.reset({
      secret: app.secret,
    });
  }, [app.secret, form]);

  return (
    <Form {...form}>
      <form
        className="flex flex-col gap-2"
        onSubmit={form.handleSubmit(() => {
          setIsConfirmDialogOpen(true);
        })}
      >
        <FormField
          control={form.control}
          name="secret"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Secret</FormLabel>
              <div className="flex flex-row gap-2">
                <FormControl>
                  <Input
                    {...field}
                    readOnly
                    value={
                      isSecretShown
                        ? field.value
                        : `${field.value.slice(0, 6)}...${field.value.slice(-6)}`
                    }
                  />
                </FormControl>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setIsSecretShown(!isSecretShown)}
                    >
                      {!isSecretShown ? (
                        <EyeIcon className="h-4 w-4" />
                      ) : (
                        <EyeOffIcon className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isSecretShown ? "Hide secret" : "Show secret"}</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => copySecret.copyToClipboard(app.secret)}
                    >
                      {copySecret.isCopied === "success" ? (
                        <CheckIcon className="h-4 w-4" />
                      ) : (
                        <CopyIcon className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy secret</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="submit" variant="secondary">
                      <RotateCwIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Refresh secret</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </FormItem>
          )}
        />
      </form>
      {isConfirmDialogOpen && (
        <AppDetailsSecretFormConfirmDialog
          app={app}
          onClose={() => setIsConfirmDialogOpen(false)}
        />
      )}
    </Form>
  );
}

function AppDetailsSecretFormConfirmDialog({
  app,
  onClose,
}: {
  app: AppSchemaType;
  onClose: () => void;
}) {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const renameAppMutation = useRefreshAppSecretMutation({
    appId: app.id,
    onSuccess() {
      toast.success("App secret refreshed successfully");

      queryClient.refetchQueries({
        exact: true,
        queryKey: createAppQueryKey(app.id),
      });

      onClose();
    },
    onError(error) {
      console.error(error);
      toast.error("Failed to refresh app secret. Please try again.");
    },
  });

  if (isMobile) {
    return (
      <Drawer
        open
        onOpenChange={() => {
          if (renameAppMutation.isPending) {
            return;
          }

          onClose();
        }}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Refresh App Secret</DrawerTitle>
            <DrawerDescription>
              Are you sure you want to refresh the app secret?
            </DrawerDescription>
          </DrawerHeader>

          <DrawerFooter>
            <Button
              variant="destructive"
              onClick={() => renameAppMutation.mutate()}
            >
              {renameAppMutation.isPending ? (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              ) : (
                "Refresh"
              )}
            </Button>

            <Button variant="outline" onClick={() => onClose()}>
              Cancel
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog
      open
      onOpenChange={() => {
        if (renameAppMutation.isPending) {
          return;
        }

        onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refresh App Secret</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Are you sure you want to refresh the app secret?
        </DialogDescription>
        <DialogFooter>
          <Button
            disabled={renameAppMutation.isPending}
            variant="outline"
            onClick={() => onClose()}
          >
            Cancel
          </Button>
          <Button
            disabled={renameAppMutation.isPending}
            variant="destructive"
            onClick={() => renameAppMutation.mutate()}
          >
            {renameAppMutation.isPending ? (
              <Loader2Icon className="h-4 w-4 animate-spin" />
            ) : (
              "Refresh"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
