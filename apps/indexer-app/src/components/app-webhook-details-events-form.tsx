import type { AppSchemaType, AppWebhookSchemaType } from "@/api/schemas/apps";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AppWebhookUpdateRequestSchema,
  WebhookEventNames,
  type AppWebhookUpdateRequestSchemaType,
} from "@/api/schemas/apps";
import { toast } from "sonner";
import { ZodError } from "zod";
import { createWebhookQueryKey } from "@/queries/query-keys";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Button } from "./ui/button";
import { CheckIcon, Loader2Icon, PencilIcon } from "lucide-react";
import { useUpdateWebhookMutation } from "@/mutations/webhooks";
import { Checkbox } from "./ui/checkbox";

export function AppWebhookDetailsEventsForm({
  app,
  webhook,
}: {
  app: AppSchemaType;
  webhook: AppWebhookSchemaType;
}) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const form = useForm({
    resolver: zodResolver(
      AppWebhookUpdateRequestSchema.required({ eventFilter: true }),
    ),
    defaultValues: {
      eventFilter: webhook.eventFilter.filter((event) => event !== "test"),
    },
  });
  const updateWebhookMutation = useUpdateWebhookMutation({
    appId: app.id,
    webhookId: webhook.id,
    onSuccess() {
      setIsEditing(false);
      toast.success("Webhook events updated successfully");

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
        toast.error("Failed to update webhook events. Please try again.");
      }
    },
  });

  useEffect(() => {
    form.reset({
      eventFilter: webhook.eventFilter.filter((event) => event !== "test"),
    });
  }, [form, webhook.eventFilter]);

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
          name="eventFilter"
          render={({ field }) => (
            <FormItem>
              <div className="flex flex-row items-center gap-2">
                <FormLabel>Events</FormLabel>
                {!isEditing ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className="p-0 h-4"
                        type="button"
                        variant="link"
                        onClick={() => setIsEditing(true)}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Edit events</p>
                    </TooltipContent>
                  </Tooltip>
                ) : null}
              </div>
              <div className="flex flex-row flex-wrap gap-2">
                {WebhookEventNames.filter((event) =>
                  isEditing
                    ? event !== "test"
                    : field.value?.includes(event) && event !== "test",
                ).map((event) => (
                  <FormField
                    control={form.control}
                    key={event}
                    name="eventFilter"
                    render={() => (
                      <FormItem className="flex flex-row items-center gap-2 space-y-0">
                        <Checkbox
                          disabled={!isEditing}
                          checked={field.value.includes(event)}
                          onCheckedChange={(checked) => {
                            return checked
                              ? field.onChange([...field.value, event])
                              : field.onChange(
                                  field.value?.filter(
                                    (value) => value !== event,
                                  ),
                                );
                          }}
                          id={`${event}-checkbox`}
                        />
                        <FormLabel
                          className="flex items-center gap-2"
                          htmlFor={`${event}-checkbox`}
                        >
                          {event}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
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
                        <p>Save events</p>
                      </TooltipContent>
                    </Tooltip>
                  </>
                ) : null}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
