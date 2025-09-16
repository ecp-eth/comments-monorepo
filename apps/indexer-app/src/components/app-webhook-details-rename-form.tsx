import type { AppSchemaType, AppWebhookSchemaType } from "@/api/schemas/apps";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AppWebhookUpdateRequestSchema,
  type AppWebhookUpdateRequestSchemaType,
} from "@/api/schemas/apps";
import { toast } from "sonner";
import { ZodError } from "zod";
import { createWebhookQueryKey } from "@/queries/query-keys";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Button } from "./ui/button";
import { CheckIcon, Loader2Icon, PencilIcon } from "lucide-react";
import { useUpdateWebhookMutation } from "@/mutations/webhooks";

export function AppWebhookDetailsRenameForm({
  app,
  webhook,
}: {
  app: AppSchemaType;
  webhook: AppWebhookSchemaType;
}) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const form = useForm({
    resolver: zodResolver(AppWebhookUpdateRequestSchema),
    defaultValues: {
      name: webhook.name,
    },
  });
  const updateWebhookMutation = useUpdateWebhookMutation({
    appId: app.id,
    webhookId: webhook.id,
    onSuccess() {
      setIsEditing(false);
      toast.success("Webhook renamed successfully");

      queryClient.refetchQueries({
        exact: true,
        queryKey: createWebhookQueryKey(app.id, webhook.id),
      });
    },
    onError(error) {
      if (error instanceof ZodError) {
        error.issues.forEach((issue) => {
          form.setError(
            issue.path.join(".") as keyof AppWebhookUpdateRequestSchemaType,
            {
              message: issue.message,
            },
          );
        });
      } else {
        console.error(error);
        toast.error("Failed to rename webhook. Please try again.");
      }
    },
  });

  useEffect(() => {
    form.reset({
      name: webhook.name,
    });
  }, [form, webhook.name]);

  return (
    <Form {...form}>
      <form
        className="flex flex-col gap-2"
        onSubmit={form.handleSubmit((values) => {
          if (values.name === webhook.name) {
            setIsEditing(false);
            return;
          }

          updateWebhookMutation.mutate(values);
        })}
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <div className="flex flex-row gap-2">
                <FormControl>
                  <Input {...field} readOnly={!isEditing} />
                </FormControl>
                {isEditing ? (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          disabled={updateWebhookMutation.isPending}
                          type="submit"
                          variant="secondary"
                        >
                          {updateWebhookMutation.isPending ? (
                            <Loader2Icon className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckIcon className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Save name</p>
                      </TooltipContent>
                    </Tooltip>
                  </>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setIsEditing(true)}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Edit name</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
