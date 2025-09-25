import type { AppSchemaType, AppWebhookSchemaType } from "@/api/schemas/apps";
import { AppWebhookDetailsRenameForm } from "@/components/app-webhook-details-rename-form";
import { AppWebhookDetailsUrlForm } from "@/components/app-webhook-details-url-form";
import { AppWebhookDetailsEventsForm } from "@/components/app-webhook-details-events-form";
import { AppWebhookDetailsAuthForm } from "@/components/app-webhook-details-auth-form";
import { AppWebhookDetailsDeleteButton } from "@/components/app-webhook-details-delete-button";
import { AppWebhookDetailsTestButton } from "@/components/app-webhook-details-test-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WebhookDetailsCard({
  app,
  webhook,
}: {
  app: AppSchemaType;
  webhook: AppWebhookSchemaType;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhook Details</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <AppWebhookDetailsRenameForm app={app} webhook={webhook} />
        <AppWebhookDetailsUrlForm app={app} webhook={webhook} />
        <AppWebhookDetailsEventsForm app={app} webhook={webhook} />
        <AppWebhookDetailsAuthForm app={app} webhook={webhook} />
        <div className="flex flex-row gap-2 pt-4">
          <AppWebhookDetailsDeleteButton app={app} webhook={webhook} />
          <AppWebhookDetailsTestButton app={app} webhook={webhook} />
        </div>
      </CardContent>
    </Card>
  );
}
