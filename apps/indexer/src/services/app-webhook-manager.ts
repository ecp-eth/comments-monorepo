import z from "zod";
import { WebhookAuthConfigSchema } from "../webhooks/schemas";
import type { AppWebhookSelectType } from "../../schema.offchain";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { schema } from "../../schema";
import { EventNamesSchema } from "../events/shared/schemas";
import { eq } from "drizzle-orm";

type AppWebhookManagerOptions = {
  db: NodePgDatabase<typeof schema>;
};

export class AppWebhookManager implements IAppWebhookManager {
  private readonly db: NodePgDatabase<typeof schema>;

  constructor(options: AppWebhookManagerOptions) {
    this.db = options.db;
  }

  async createAppWebhook(params: IAppWebhookManager_CreateAppWebhookParams) {
    const { app, webhook } = CreateAppWebhookParamsSchema.parse(params);

    return await this.db.transaction(async (tx) => {
      const [appWebhook] = await tx
        .insert(schema.appWebhook)
        .values({
          appId: app.id,
          name: webhook.name,
          url: webhook.url,
          auth: webhook.auth,
          eventFilter: webhook.events,
        })
        .returning()
        .execute();

      if (!appWebhook) {
        throw new AppWebhookManagerFailedToCreateAppWebhookError();
      }

      return {
        appWebhook,
      };
    });
  }

  async deleteAppWebhook(params: IAppWebhookManager_DeleteAppWebhookParams) {
    const { appId, webhookId } = DeleteAppWebhookParamsSchema.parse(params);

    return await this.db.transaction(async (tx) => {
      const appWebhook = await tx.query.appWebhook.findFirst({
        where(fields, operators) {
          return operators.and(
            operators.eq(fields.id, webhookId),
            operators.eq(fields.appId, appId),
          );
        },
      });

      if (!appWebhook) {
        throw new AppWebhookManagerAppWebhookNotFoundError();
      }

      await tx
        .delete(schema.appWebhook)
        .where(eq(schema.appWebhook.id, webhookId))
        .execute();

      return {
        appWebhook,
      };
    });
  }

  async listAppWebhooks(params: IAppWebhookManager_ListAppWebhooksParams) {
    const { app, page, limit } = ListAppWebhooksParamsSchema.parse(params);

    const appWebhooksCount = await this.db.$count(
      schema.appWebhook,
      eq(schema.appWebhook.appId, app.id),
    );

    const totalPages = Math.ceil(appWebhooksCount / limit);

    const appWebhooks = await this.db.query.appWebhook.findMany({
      where(fields, operators) {
        return operators.eq(fields.appId, app.id);
      },
      orderBy(fields, operators) {
        return operators.desc(fields.createdAt);
      },
      offset: (page - 1) * limit,
      limit,
    });

    return {
      appWebhooks,
      pageInfo: {
        totalPages,
      },
    };
  }
}

const CreateAppWebhookParamsSchema = z.object({
  app: z.object({
    id: z.string().uuid(),
    ownerId: z.string().uuid(),
  }),
  webhook: z.object({
    url: z.string().url(),
    events: z.array(EventNamesSchema),
    auth: WebhookAuthConfigSchema,
    name: z.string(),
  }),
});

type IAppWebhookManager_CreateAppWebhookParams = z.infer<
  typeof CreateAppWebhookParamsSchema
>;

type IAppWebhookManager_CreateAppWebhookResult = {
  appWebhook: AppWebhookSelectType;
};

const ListAppWebhooksParamsSchema = z.object({
  app: z.object({
    id: z.string().uuid(),
    ownerId: z.string().uuid(),
  }),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

type IAppWebhookManager_ListAppWebhooksParams = z.infer<
  typeof ListAppWebhooksParamsSchema
>;

type IAppWebhookManager_ListAppWebhooksResult = {
  appWebhooks: AppWebhookSelectType[];
  pageInfo: {
    totalPages: number;
  };
};

const DeleteAppWebhookParamsSchema = z.object({
  appId: z.string().uuid(),
  webhookId: z.string().uuid(),
});

type IAppWebhookManager_DeleteAppWebhookParams = z.infer<
  typeof DeleteAppWebhookParamsSchema
>;

type IAppWebhookManager_DeleteAppWebhookResult = {
  appWebhook: AppWebhookSelectType;
};

export interface IAppWebhookManager {
  createAppWebhook: (
    params: IAppWebhookManager_CreateAppWebhookParams,
  ) => Promise<IAppWebhookManager_CreateAppWebhookResult>;

  listAppWebhooks: (
    params: IAppWebhookManager_ListAppWebhooksParams,
  ) => Promise<IAppWebhookManager_ListAppWebhooksResult>;

  deleteAppWebhook: (
    params: IAppWebhookManager_DeleteAppWebhookParams,
  ) => Promise<IAppWebhookManager_DeleteAppWebhookResult>;
}

export class AppWebhookManagerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppWebhookManagerError";
  }
}

export class AppWebhookManagerFailedToCreateAppWebhookError extends AppWebhookManagerError {
  constructor() {
    super("Failed to create app webhook");
    this.name = "AppWebhookManagerFailedToCreateAppWebhookError";
  }
}

export class AppWebhookManagerAppWebhookNotFoundError extends AppWebhookManagerError {
  constructor() {
    super("App webhook not found");
    this.name = "AppWebhookManagerAppWebhookNotFoundError";
  }
}
