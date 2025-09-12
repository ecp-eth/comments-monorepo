import type { AppSchemaType } from "@/api/schemas/apps";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AppUpdateRequestSchema,
  AppUpdateRequestSchemaType,
} from "@/api/schemas/apps";
import { useRenameAppMutation } from "@/mutations/apps";
import { toast } from "sonner";
import { ZodError } from "zod";
import { createAppQueryKey } from "@/queries/query-keys";
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

export function AppDetailsRenameForm({ app }: { app: AppSchemaType }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const form = useForm({
    resolver: zodResolver(AppUpdateRequestSchema),
    defaultValues: {
      name: app.name,
    },
  });
  const renameAppMutation = useRenameAppMutation({
    appId: app.id,
    onSuccess() {
      setIsEditing(false);
      toast.success("App renamed successfully");

      queryClient.refetchQueries({
        exact: true,
        queryKey: createAppQueryKey(app.id),
      });
    },
    onError(error) {
      if (error instanceof ZodError) {
        error.issues.forEach((issue) => {
          form.setError(
            issue.path.join(".") as keyof AppUpdateRequestSchemaType,
            {
              message: issue.message,
            },
          );
        });
      } else {
        console.error(error);
        toast.error("Failed to rename app. Please try again.");
      }
    },
  });

  useEffect(() => {
    form.reset({
      name: app.name,
    });
  }, [form, app.name]);

  return (
    <Form {...form}>
      <form
        className="flex flex-col gap-2"
        onSubmit={form.handleSubmit((values) => {
          if (values.name === app.name) {
            setIsEditing(false);
            return;
          }

          renameAppMutation.mutate(values);
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
                          disabled={renameAppMutation.isPending}
                          type="submit"
                          variant="secondary"
                        >
                          {renameAppMutation.isPending ? (
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
