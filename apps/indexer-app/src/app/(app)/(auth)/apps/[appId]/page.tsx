"use client";

import { AppHeader } from "@/components/app-header";
import { AppContent } from "@/components/app-content";
import { ErrorScreen } from "@/components/error-screen";
import { Input } from "@/components/ui/input";
import { AppNotFoundError } from "@/errors";
import { useAppQuery } from "@/queries/app";
import { use, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useMeQuery } from "@/queries/me";
import { useProtectRoute } from "@/hooks/use-protect-route";
import {
  CheckIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  RotateCwIcon,
  WebhookIcon,
  PencilIcon,
  Loader2Icon,
} from "lucide-react";
import { useWebhooksQuery } from "@/queries/webhooks";
import { EmptyScreen } from "@/components/empty-screen";
import { CreateWebhookDialogButton } from "@/components/create-webhook-dialog-button";
import { DataTable } from "@/components/data-table";
import {
  AppUpdateRequestSchema,
  AppUpdateRequestSchemaType,
  AppWebhooksListResponseSchemaType,
} from "@/api/schemas/apps";
import { ColumnDef } from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { Label } from "@/components/ui/label";
import { type AppSchemaType } from "@/api/schemas/apps";
import { useRenameAppMutation } from "@/mutations/apps";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ZodError } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useQueryClient } from "@tanstack/react-query";
import { createAppQueryKey } from "@/queries/query-keys";

export default function AppPage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId } = use(params);
  const meQuery = useMeQuery();
  const appQuery = useAppQuery({ appId, refetchOnMount: true });

  useProtectRoute(meQuery);
  useProtectRoute(appQuery);

  if (meQuery.status === "pending") {
    // @todo loading screen
    return null;
  }

  if (meQuery.status === "error") {
    console.error(meQuery.error);

    return (
      <>
        <AppHeader breadcrumbs={[{ label: "Apps", href: "/apps" }]} />
        <ErrorScreen
          title="Error fetching your identity"
          description="Please try again later. If the problem persists, please contact support."
          actions={
            <Button
              disabled={meQuery.isRefetching}
              onClick={() => meQuery.refetch()}
              className="gap-2"
            >
              <RotateCwIcon className="h-4 w-4" />
              Retry
            </Button>
          }
        />
      </>
    );
  }

  if (appQuery.status === "pending") {
    // @todo loading screen
    return null;
  }

  if (
    appQuery.status === "error" &&
    appQuery.error instanceof AppNotFoundError
  ) {
    return (
      <>
        <AppHeader breadcrumbs={[{ label: "Apps", href: "/apps" }]} />
        <ErrorScreen
          title="App not found"
          description="The app you are looking for does not exist."
          actions={
            <Button asChild>
              <Link href="/apps">Go back</Link>
            </Button>
          }
        />
      </>
    );
  }

  if (appQuery.status === "error") {
    console.error(appQuery.error);

    return (
      <>
        <AppHeader breadcrumbs={[{ label: "Apps", href: "/apps" }]} />
        <ErrorScreen
          title="Error fetching app"
          description="Please try again later. If the problem persists, please contact support."
          actions={
            <Button
              disabled={appQuery.isRefetching}
              onClick={() => appQuery.refetch()}
              className="gap-2"
            >
              <RotateCwIcon className="h-4 w-4" />
              Retry
            </Button>
          }
        />
      </>
    );
  }

  // @todo render app details + statistics + webhooks

  return (
    <>
      <AppHeader
        breadcrumbs={[
          { label: "Apps", href: "/apps" },
          { label: appQuery.data.name, href: `/apps/${appId}` },
        ]}
      />
      <AppContent className="flex-col gap-4">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3 w-full">
          <AppDetailsCard app={appQuery.data} />
          <div className="bg-muted/50 aspect-video rounded-xl" />
          <div className="bg-muted/50 aspect-video rounded-xl" />
        </div>
        <div className="flex flex-col flex-1 gap-4">
          <h2 className="text-lg font-medium">Webhooks</h2>
          <WebhooksList appId={appId} />
        </div>
      </AppContent>
    </>
  );
}

function AppDetailsRenameForm({ app }: { app: AppSchemaType }) {
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

function AppDetailsCard({ app }: { app: AppSchemaType }) {
  const [isSecretShown, setIsSecretShown] = useState(false);
  const copySecret = useCopyToClipboard();

  return (
    <Card>
      <CardHeader>
        <CardTitle>App Details</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <AppDetailsRenameForm app={app} />
        <form className="flex flex-col gap-2">
          <Label htmlFor="app-secret">Secret</Label>
          <div className="flex flex-row gap-2">
            <Input
              readOnly
              id="app-secret"
              value={
                isSecretShown
                  ? app.secret
                  : app.secret.slice(0, 6) + "..." + app.secret.slice(-6)
              }
            />
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
        </form>

        <div>
          <Button variant="destructive">Delete App</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function WebhooksList({ appId }: { appId: string }) {
  const webhooksQuery = useWebhooksQuery({ appId });
  const columns = useMemo(
    () => createWebhooksDataTableColumns({ appId }),
    [appId],
  );

  useProtectRoute(webhooksQuery);

  if (webhooksQuery.status === "pending") {
    // @todo loading screen
    return null;
  }

  if (webhooksQuery.status === "error") {
    console.error(webhooksQuery.error);

    return (
      <ErrorScreen
        title="Error fetching webhooks"
        description="Please try again later. If the problem persists, please contact support."
        actions={
          <Button
            disabled={webhooksQuery.isRefetching}
            onClick={() => webhooksQuery.refetch()}
            className="gap-2"
          >
            <RotateCwIcon className="h-4 w-4" />
            Retry
          </Button>
        }
      />
    );
  }

  if (webhooksQuery.data.results.length === 0) {
    return (
      <EmptyScreen
        icon={<WebhookIcon />}
        title="No webhooks"
        description="You don't have any webhooks yet"
        actions={<CreateWebhookDialogButton appId={appId} />}
      />
    );
  }

  return (
    <DataTable
      data={webhooksQuery.data.results}
      columns={columns}
      tableActions={<CreateWebhookDialogButton appId={appId} />}
    />
  );
}

function createWebhooksDataTableColumns({
  appId,
}: {
  appId: string;
}): ColumnDef<AppWebhooksListResponseSchemaType["results"][number]>[] {
  return [
    {
      header: "Name",
      accessorKey: "name",
      cell: ({ row }) => {
        return (
          <Button asChild variant="link">
            <Link href={`/apps/${appId}/webhooks/${row.original.id}`}>
              {row.original.name}
            </Link>
          </Button>
        );
      },
    },
    {
      header: "URL",
      accessorKey: "url",
      cell: ({ row }) => {
        return <span>{row.original.url}</span>;
      },
    },
  ];
}
