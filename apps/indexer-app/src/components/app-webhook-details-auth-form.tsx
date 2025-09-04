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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Button } from "./ui/button";
import { CheckIcon, Loader2Icon, PencilIcon } from "lucide-react";
import { useUpdateWebhookMutation } from "@/mutations/webhooks";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export function AppWebhookDetailsAuthForm({
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
      AppWebhookUpdateRequestSchema.required({ auth: true }),
    ),
    defaultValues: {
      auth: webhook.auth,
    },
  });
  const updateWebhookMutation = useUpdateWebhookMutation({
    appId: app.id,
    webhookId: webhook.id,
    onSuccess() {
      setIsEditing(false);
      toast.success("Webhook authentication updated successfully");

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
        toast.error(
          "Failed to update webhook authentication. Please try again.",
        );
      }
    },
  });

  useEffect(() => {
    form.reset({
      auth: webhook.auth,
    });
  }, [form, webhook.auth]);

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
        <FormItem>
          <div className="flex flex-row items-center gap-2">
            <FormLabel>Authentication</FormLabel>
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
            <FormField
              control={form.control}
              name="auth.type"
              render={({ field: authTypeField }) => (
                <FormItem className="flex flex-col gap-2">
                  <FormField
                    control={form.control}
                    name="auth.type"
                    render={({ field }) => (
                      <FormItem>
                        <Select
                          disabled={!isEditing}
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a value" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no-auth">
                              No authentication
                            </SelectItem>
                            <SelectItem value="http-basic-auth">
                              HTTP Basic Authentication
                            </SelectItem>
                            <SelectItem value="header">Header</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {authTypeField.value === "http-basic-auth" && (
                    <>
                      <FormField
                        disabled={!isEditing}
                        control={form.control}
                        name="auth.username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        disabled={!isEditing}
                        control={form.control}
                        name="auth.password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input placeholder="Password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                  {authTypeField.value !== "no-auth" && (
                    <>
                      <FormField
                        disabled={!isEditing}
                        defaultValue="Authorization"
                        control={form.control}
                        name="auth.headerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Header Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Header Name" {...field} />
                            </FormControl>
                            <FormDescription>
                              This is the name of the header that will be sent
                              to the webhook.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                  {authTypeField.value === "header" && (
                    <>
                      <FormField
                        disabled={!isEditing}
                        defaultValue="Bearer "
                        control={form.control}
                        name="auth.headerValue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Header Value</FormLabel>
                            <FormControl>
                              <Input placeholder="Header Value" {...field} />
                            </FormControl>
                            <FormDescription>
                              This is the value of the header that will be sent
                              to the webhook.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
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
      </form>
    </Form>
  );
}
