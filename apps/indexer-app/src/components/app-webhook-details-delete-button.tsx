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
import { Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";
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
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { AppSchemaType, AppWebhookSchemaType } from "@/api/schemas/apps";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "./ui/form";
import { Input } from "./ui/input";
import { useDeleteWebhookMutation } from "@/mutations/webhooks";

export function AppWebhookDetailsDeleteButton({
  app,
  webhook,
}: {
  app: AppSchemaType;
  webhook: AppWebhookSchemaType;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const deleteWebhookMutation = useDeleteWebhookMutation({
    appId: app.id,
    webhookId: webhook.id,
    onSuccess() {
      toast.success("Webhook deleted successfully");
      setIsOpen(false);

      router.replace(`/apps/${app.id}`);
    },
    onError(error) {
      console.error(error);
      toast.error("Failed to delete webhook");
    },
  });
  const isMobile = useIsMobile();
  const form = useForm({
    resolver: zodResolver(
      z.object({
        name: z.literal(app.name, {
          errorMap(issue, ctx) {
            if (issue.code === "invalid_literal") {
              return {
                message: "The name is incorrect",
              };
            }

            return {
              message: ctx.defaultError,
            };
          },
        }),
      }),
    ),
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <Form {...form}>
          <form
            id="delete-webhook-form"
            onSubmit={form.handleSubmit(() => {
              deleteWebhookMutation.mutate();
            })}
          >
            <DrawerTrigger asChild>
              <Button variant="destructive">Delete Webhook</Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Delete Webhook</DrawerTitle>
                <DrawerDescription>
                  Are you sure you want to delete this webhook?
                </DrawerDescription>
              </DrawerHeader>
              <div className="flex flex-col gap-4 p-4 text-sm">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Webhook Name</FormLabel>
                      <FormControl>
                        <Input {...field} required />
                      </FormControl>
                      <FormDescription>
                        Please enter the name <strong>{webhook.name}</strong> of
                        the webhook to delete.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                ></FormField>
              </div>
              <DrawerFooter>
                <Button
                  disabled={deleteWebhookMutation.isPending}
                  variant="destructive"
                  type="submit"
                  form="delete-webhook-form"
                >
                  {deleteWebhookMutation.isPending ? (
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                  ) : (
                    "Delete"
                  )}
                </Button>
                <Button
                  disabled={deleteWebhookMutation.isPending}
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
              </DrawerFooter>
            </DrawerContent>
          </form>
        </Form>
      </Drawer>
    );
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (deleteWebhookMutation.isPending) {
          return;
        }

        setIsOpen(open);
      }}
    >
      <Form {...form}>
        <form
          id="delete-webhook-dialog-form"
          onSubmit={form.handleSubmit(() => {
            deleteWebhookMutation.mutate();
          })}
        >
          <DialogTrigger asChild>
            <Button variant="destructive">Delete Webhook</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Webhook</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this webhook?
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Webhook Name</FormLabel>
                    <FormControl>
                      <Input {...field} required />
                    </FormControl>
                    <FormDescription>
                      Please enter the name <strong>{webhook.name}</strong> of
                      the webhook to delete.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                disabled={deleteWebhookMutation.isPending}
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={deleteWebhookMutation.isPending}
                variant="destructive"
                type="submit"
                form="delete-webhook-dialog-form"
              >
                {deleteWebhookMutation.isPending ? (
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                ) : (
                  "Delete"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </form>
      </Form>
    </Dialog>
  );
}
