"use client";
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
import {
  useRefreshAppSecretMutation,
  useRevealAppSecretMutation,
} from "@/mutations/apps";
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
  const revealAppSecretMutation = useRevealAppSecretMutation({
    appId: app.id,
    onError(error) {
      console.error(error);
      toast.error("Failed to reveal app secret. Please try again.");
    },
  });
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
                      isSecretShown && revealAppSecretMutation.isSuccess
                        ? revealAppSecretMutation.data.secret
                        : app.secret
                    }
                  />
                </FormControl>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      disabled={revealAppSecretMutation.isPending}
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        if (!isSecretShown) {
                          if (!revealAppSecretMutation.isSuccess) {
                            revealAppSecretMutation.mutate();
                          }

                          setIsSecretShown(true);
                        } else {
                          setIsSecretShown(!isSecretShown);
                        }
                      }}
                    >
                      {revealAppSecretMutation.isPending ? (
                        <Loader2Icon className="h-4 w-4 animate-spin" />
                      ) : !isSecretShown ? (
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
                      disabled={revealAppSecretMutation.isPending}
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        if (revealAppSecretMutation.isSuccess) {
                          copySecret.copyToClipboard(
                            revealAppSecretMutation.data.secret,
                          );
                        } else {
                          revealAppSecretMutation.mutateAsync().then((data) => {
                            copySecret.copyToClipboard(data.secret);
                          });
                        }
                      }}
                    >
                      {revealAppSecretMutation.isPending ? (
                        <Loader2Icon className="h-4 w-4 animate-spin" />
                      ) : copySecret.isCopied === "success" ? (
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
          onRefresh={() => {
            revealAppSecretMutation.reset();
            setIsSecretShown(false);
          }}
        />
      )}
    </Form>
  );
}

function AppDetailsSecretFormConfirmDialog({
  app,
  onClose,
  onRefresh,
}: {
  app: AppSchemaType;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const refreshAppSecretMutation = useRefreshAppSecretMutation({
    appId: app.id,
    onSuccess() {
      toast.success("App secret refreshed successfully");

      queryClient.refetchQueries({
        exact: true,
        queryKey: createAppQueryKey(app.id),
      });

      onClose();
      onRefresh();
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
          if (refreshAppSecretMutation.isPending) {
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
              disabled={refreshAppSecretMutation.isPending}
              variant="destructive"
              onClick={() => refreshAppSecretMutation.mutate()}
            >
              {refreshAppSecretMutation.isPending ? (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              ) : (
                "Refresh"
              )}
            </Button>

            <Button
              disabled={refreshAppSecretMutation.isPending}
              variant="outline"
              onClick={() => onClose()}
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
      open
      onOpenChange={() => {
        if (refreshAppSecretMutation.isPending) {
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
            disabled={refreshAppSecretMutation.isPending}
            variant="outline"
            onClick={() => onClose()}
          >
            Cancel
          </Button>
          <Button
            disabled={refreshAppSecretMutation.isPending}
            variant="destructive"
            onClick={() => refreshAppSecretMutation.mutate()}
          >
            {refreshAppSecretMutation.isPending ? (
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
