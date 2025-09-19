import { ChevronsUpDownIcon, Loader2Icon, PlusIcon } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ZodError } from "zod";
import { useForm } from "react-hook-form";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import {
  AppWebhookCreateRequestSchema,
  AppWebhookCreateRequestSchemaType,
  WebhookEventNames,
} from "@/api/schemas/apps";
import { useCreateWebhookMutation } from "@/mutations/webhooks";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./ui/drawer";
import { Checkbox } from "./ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import Link from "next/link";

type CreateWebhookDialogButtonProps = {
  appId: string;
  className?: string;
  formClassName?: string;
};

export function CreateWebhookDialogButton({
  appId,
  className,
  formClassName,
}: CreateWebhookDialogButtonProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [isEventsOpen, setIsEventsOpen] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(AppWebhookCreateRequestSchema),
    defaultValues: {
      name: "",
      auth: { type: "no-auth" },
      events: WebhookEventNames.filter((item) => item !== "test"),
      url: "",
    },
  });

  const createWebhookMutation = useCreateWebhookMutation({
    appId,
    onError(error) {
      if (error instanceof ZodError) {
        error.issues.forEach((issue) => {
          form.setError(
            issue.path.join(".") as keyof AppWebhookCreateRequestSchemaType,
            {
              message: issue.message,
            },
          );
        });
      } else {
        console.error(error);
        toast.error("Failed to create webhook. Please try again.");
      }
    },
    onSuccess(data) {
      form.reset();
      toast.success("Webhook created successfully");
      router.push(`/apps/${appId}/webhooks/${data.id}`);

      setIsOpen(false);
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    try {
      return createWebhookMutation.mutateAsync(values);
    } catch {
      // we don't care, error is handled in mutation's onError handler
    }
  });

  // Reset the state if closing the dialog
  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setIsEventsOpen(true);
      setIsAuthOpen(false);
    }
  }, [isOpen, form]);

  const formAuthType = form.watch("auth.type");

  useEffect(() => {
    if (formAuthType === "no-auth") {
      form.resetField("auth", {
        defaultValue: {
          type: "no-auth",
        },
      });
    } else if (formAuthType === "http-basic-auth") {
      form.resetField("auth", {
        defaultValue: {
          type: formAuthType,
          username: "",
          password: "",
          headerName: "Authorization",
        },
      });
    } else if (formAuthType === "header") {
      form.resetField("auth", {
        defaultValue: {
          type: formAuthType,
          headerValue: "Bearer",
          headerName: "Authorization",
        },
      });
    }
  }, [formAuthType, form]);

  const formContent = (
    <div className="flex flex-col gap-4">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input placeholder="My Webhook" {...field} />
            </FormControl>
            <FormDescription>
              This is your webhook name. It can&apos;t be longer than 50
              characters.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="url"
        render={({ field }) => (
          <FormItem>
            <FormLabel>URL</FormLabel>
            <FormControl>
              <Input placeholder="https://my-app.tld/webhook" {...field} />
            </FormControl>
            <FormDescription>
              This is the URL that will receive the webhook events.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="events"
        render={({ field }) => (
          <Collapsible open={isEventsOpen} onOpenChange={setIsEventsOpen}>
            <FormItem className="flex flex-col gap-2">
              <div>
                <div className="flex gap-2 items-center">
                  <FormLabel className="text-base">
                    Events {!isEventsOpen ? `(${field.value.length})` : ""}
                  </FormLabel>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <ChevronsUpDownIcon />
                      <span className="sr-only">Toggle</span>
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <FormDescription>
                  <p>Select the events you want to send to the webhook.</p>
                  <p>
                    <Link
                      className="underline"
                      href="https://docs.ethcomments.xyz/sdk-reference/indexer/webhooks/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Learn more
                    </Link>{" "}
                    about the events in our documentation.
                  </p>
                </FormDescription>
              </div>
              <CollapsibleContent>
                {WebhookEventNames.filter((item) => item !== "test").map(
                  (item) => (
                    <FormField
                      key={item}
                      control={form.control}
                      name="events"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={item}
                            className="flex flex-row items-center gap-2 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(item)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, item])
                                    : field.onChange(
                                        field.value?.filter(
                                          (value) => value !== item,
                                        ),
                                      );
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              {item}
                            </FormLabel>
                          </FormItem>
                        );
                      }}
                    />
                  ),
                )}
              </CollapsibleContent>
              <FormMessage />
            </FormItem>
          </Collapsible>
        )}
      />

      <Collapsible open={isAuthOpen} onOpenChange={setIsAuthOpen}>
        <FormField
          control={form.control}
          name="auth.type"
          render={({ field: authTypeField }) => (
            <FormItem className="flex flex-col gap-2">
              <div>
                <div className="flex gap-2 items-center">
                  <FormLabel className="text-base">
                    Authentication{" "}
                    {!isAuthOpen ? `(${form.getValues("auth.type")})` : ""}
                  </FormLabel>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <ChevronsUpDownIcon />
                      <span className="sr-only">Toggle</span>
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <FormDescription>
                  Select the authentication method you want to use for the
                  webhook.
                </FormDescription>
              </div>
              <CollapsibleContent className="flex flex-col gap-2">
                <FormField
                  control={form.control}
                  name="auth.type"
                  render={({ field }) => (
                    <FormItem>
                      <Select
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
                            This is the name of the header that will be sent to
                            the webhook.
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
                            This is the value of the header that will be sent to
                            the webhook.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </CollapsibleContent>
              <FormMessage />
            </FormItem>
          )}
        />
      </Collapsible>
    </div>
  );

  const formID = "create-webhook-dialog-form";

  if (isMobile) {
    return (
      <Drawer
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
        }}
        direction="bottom"
      >
        <Form {...form}>
          <form id={formID} onSubmit={handleSubmit} className={formClassName}>
            <DrawerTrigger asChild>
              <Button className={className} type="button">
                <PlusIcon /> Create webhook
              </Button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[80vh]">
              <DrawerHeader>
                <DrawerTitle>New webhook</DrawerTitle>
              </DrawerHeader>
              <div className="p-4 overflow-y-auto text-sm">{formContent}</div>
              <DrawerFooter>
                <Button
                  className="gap-2"
                  disabled={createWebhookMutation.isPending}
                  type="submit"
                  form={formID}
                >
                  {createWebhookMutation.isPending ? (
                    <>
                      <Loader2Icon className="w-4 h-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create</span>
                  )}
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
        setIsOpen(open);
      }}
    >
      <Form {...form}>
        <form id={formID} onSubmit={handleSubmit} className={formClassName}>
          <DialogTrigger asChild>
            <Button className={className} type="button">
              <PlusIcon /> Create webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>New webhook</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto -m-2 p-2">{formContent}</div>
            <DialogFooter>
              <Button
                className="gap-2"
                disabled={createWebhookMutation.isPending}
                type="submit"
                form={formID}
              >
                {createWebhookMutation.isPending ? (
                  <>
                    <Loader2Icon className="w-4 h-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create</span>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </form>
      </Form>
    </Dialog>
  );
}
