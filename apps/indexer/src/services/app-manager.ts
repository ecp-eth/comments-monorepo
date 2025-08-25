import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import crypto from "node:crypto";
import { z } from "zod";
import { schema } from "../../schema";
import type {
  AppSelectType,
  AppSigningKeysSelectType,
} from "../../schema.offchain";
import { and, desc, eq, isNull } from "drizzle-orm";

type AppManagerOptions = {
  db: NodePgDatabase<typeof schema>;
};

export class AppManager implements IAppManager {
  private readonly db: NodePgDatabase<typeof schema>;

  constructor(options: AppManagerOptions) {
    this.db = options.db;
  }

  async createApp(params: IAppManager_CreateAppParams) {
    const { name, ownerId } = CreateAppParamsSchema.parse(params);

    return await this.db.transaction(async (tx) => {
      const [app] = await tx
        .insert(schema.app)
        .values({
          name,
          ownerId,
        })
        .returning()
        .execute();

      if (!app) {
        throw new AppManagerFailedToCreateAppError();
      }

      const secret = this.generateRandomAppSecret();

      // create signing key
      const [signingKey] = await tx
        .insert(schema.appSigningKeys)
        .values({
          appId: app.id,
          secret,
        })
        .returning()
        .execute();

      if (!signingKey) {
        throw new AppManagerFailedToCreateSecretKeyError();
      }

      return {
        app,
        signingKey,
      };
    });
  }

  async deleteApp(params: IAppManager_DeleteAppParams) {
    const { id, ownerId } = DeleteAppParamsSchema.parse(params);

    return await this.db.transaction(async (tx) => {
      const [app] = await tx
        .delete(schema.app)
        .where(and(eq(schema.app.id, id), eq(schema.app.ownerId, ownerId)))
        .returning()
        .execute();

      if (!app) {
        throw new AppManagerAppNotFoundError();
      }

      return {
        app,
      };
    });
  }

  async refreshAppSecret(params: IAppManager_RefreshAppSecretParams) {
    const { id, ownerId } = RefreshAppSecretParamsSchema.parse(params);

    return await this.db.transaction(async (tx) => {
      const secret = this.generateRandomAppSecret();

      // check if user is the owner of the app
      const app = await tx.query.app.findFirst({
        where(fields, operators) {
          return operators.and(
            operators.eq(fields.id, id),
            operators.eq(fields.ownerId, ownerId),
          );
        },
      });

      if (!app) {
        throw new AppManagerAppNotFoundError();
      }

      // revoke existing signing key
      await tx
        .update(schema.appSigningKeys)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(schema.appSigningKeys.appId, app.id),
            isNull(schema.appSigningKeys.revokedAt),
          ),
        )
        .execute();

      const [appSigningKey] = await tx
        .insert(schema.appSigningKeys)
        .values({
          appId: app.id,
          secret,
        })
        .returning();

      if (!appSigningKey) {
        throw new AppManagerFailedToRefreshAppSecretError();
      }

      return {
        appSigningKey,
      };
    });
  }

  async listApps(params: IAppManager_ListAppsParams) {
    const { ownerId, page, limit } = ListAppsParamsSchema.parse(params);

    const totalApps = await this.db.$count(
      schema.app,
      and(eq(schema.app.ownerId, ownerId)),
    );

    const apps = await this.db.query.app.findMany({
      where(fields, operators) {
        return operators.and(operators.eq(fields.ownerId, ownerId));
      },
      orderBy: [desc(schema.app.createdAt)],
      limit,
      offset: (page - 1) * limit,
    });

    return {
      apps,
      pageInfo: {
        totalPages: Math.ceil(totalApps / limit),
      },
    };
  }

  private generateRandomAppSecret(): string {
    return crypto.randomBytes(32).toString("hex");
  }
}

const CreateAppParamsSchema = z.object({
  name: z.string().nonempty().max(50),
  ownerId: z.string().uuid(),
});

type IAppManager_CreateAppParams = z.infer<typeof CreateAppParamsSchema>;

type IAppManager_CreateAppResult = {
  app: AppSelectType;
  signingKey: AppSigningKeysSelectType;
};

const DeleteAppParamsSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
});

type IAppManager_DeleteAppParams = z.infer<typeof DeleteAppParamsSchema>;

type IAppManager_DeleteAppResult = {
  app: AppSelectType;
};

const RefreshAppSecretParamsSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
});

type IAppManager_RefreshAppSecretParams = z.infer<
  typeof RefreshAppSecretParamsSchema
>;

type IAppManager_RefreshAppSecretResult = {
  appSigningKey: AppSigningKeysSelectType;
};

const ListAppsParamsSchema = z.object({
  ownerId: z.string().uuid(),
  page: z.coerce.number().int().positive(),
  limit: z.coerce.number().int().positive().max(100),
});

type IAppManager_ListAppsParams = z.infer<typeof ListAppsParamsSchema>;

type IAppManager_ListAppsResult = {
  apps: AppSelectType[];
  pageInfo: {
    totalPages: number;
  };
};

export interface IAppManager {
  createApp: (
    params: IAppManager_CreateAppParams,
  ) => Promise<IAppManager_CreateAppResult>;

  deleteApp: (
    params: IAppManager_DeleteAppParams,
  ) => Promise<IAppManager_DeleteAppResult>;

  listApps: (
    params: IAppManager_ListAppsParams,
  ) => Promise<IAppManager_ListAppsResult>;

  refreshAppSecret: (
    params: IAppManager_RefreshAppSecretParams,
  ) => Promise<IAppManager_RefreshAppSecretResult>;
}

export class AppManagerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppManagerError";
  }
}

export class AppManagerFailedToCreateAppError extends AppManagerError {
  constructor() {
    super("Failed to create app");
    this.name = "AppManagerFailedToCreateAppError";
  }
}

export class AppManagerFailedToCreateSecretKeyError extends AppManagerError {
  constructor() {
    super("Failed to create secret");
    this.name = "AppManagerFailedToCreateSecretKeyError";
  }
}

export class AppManagerAppNotFoundError extends AppManagerError {
  constructor() {
    super("App not found");
    this.name = "AppManagerAppNotFoundError";
  }
}

export class AppManagerFailedToRefreshAppSecretError extends AppManagerError {
  constructor() {
    super("Failed to refresh app secret");
    this.name = "AppManagerFailedToRefreshAppSecretError";
  }
}
