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
    const { ownerId, appId, webhook } =
      CreateAppWebhookParamsSchema.parse(params);

    return await this.db.transaction(async (tx) => {
      const app = await tx.query.app.findFirst({
        where(fields, operators) {
          return operators.and(
            operators.eq(fields.id, appId),
            operators.eq(fields.ownerId, ownerId),
          );
        },
      });

      if (!app) {
        throw new AppWebhookManagerAppNotFoundError();
      }

      const [appWebhook] = await tx
        .insert(schema.appWebhook)
        .values({
          appId,
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

  async listAppWebhooks(params: IAppWebhookManager_ListAppWebhooksParams) {
    const { appId, ownerId, page, limit } =
      ListAppWebhooksParamsSchema.parse(params);

    const db = this.db;

    const app = await db.query.app.findFirst({
      where(fields, operators) {
        return operators.and(
          operators.eq(fields.id, appId),
          operators.eq(fields.ownerId, ownerId),
        );
      },
      extras: {
        webhooksCount: db
          .$count(schema.appWebhook, eq(schema.appWebhook.appId, schema.app.id))
          .as("webhooksCount"),
      },
    });

    if (!app) {
      throw new AppWebhookManagerAppNotFoundError();
    }

    const totalPages = Math.ceil(app.webhooksCount / limit);

    const appWebhooks = await db.query.appWebhook.findMany({
      where(fields, operators) {
        return operators.eq(fields.appId, appId);
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
  ownerId: z.string().uuid(),
  appId: z.string().uuid(),
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
  appId: z.string().uuid(),
  ownerId: z.string().uuid(),
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

export interface IAppWebhookManager {
  createAppWebhook: (
    params: IAppWebhookManager_CreateAppWebhookParams,
  ) => Promise<IAppWebhookManager_CreateAppWebhookResult>;

  listAppWebhooks: (
    params: IAppWebhookManager_ListAppWebhooksParams,
  ) => Promise<IAppWebhookManager_ListAppWebhooksResult>;
}

export class AppWebhookManagerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppWebhookManagerError";
  }
}

export class AppWebhookManagerAppNotFoundError extends AppWebhookManagerError {
  constructor() {
    super("App not found");
    this.name = "AppWebhookManagerAppNotFoundError";
  }
}

export class AppWebhookManagerFailedToCreateAppWebhookError extends AppWebhookManagerError {
  constructor() {
    super("Failed to create app webhook");
    this.name = "AppWebhookManagerFailedToCreateAppWebhookError";
  }
}
