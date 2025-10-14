import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import crypto from "node:crypto";
import { z } from "zod";
import { schema } from "../../schema.ts";
import type {
  AppSelectType,
  AppSecretKeysSelectType,
} from "../../schema.offchain.ts";
import { and, eq, isNull } from "drizzle-orm";

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

      // create secret key
      const [secretKey] = await tx
        .insert(schema.appSecretKeys)
        .values({
          appId: app.id,
          secret,
        })
        .returning()
        .execute();

      if (!secretKey) {
        throw new AppManagerFailedToCreateSecretKeyError();
      }

      return {
        app,
        secretKey,
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

  async getApp(params: IAppManager_GetAppParams) {
    const { id, ownerId } = GetAppParamsSchema.parse(params);

    const app = await this.db.query.app.findFirst({
      where(fields, operators) {
        return operators.and(
          operators.eq(fields.id, id),
          operators.eq(fields.ownerId, ownerId),
        );
      },
      with: {
        appSecretKeys: {
          where(fields, operators) {
            return operators.isNull(fields.revokedAt);
          },
        },
      },
    });

    if (!app) {
      throw new AppManagerAppNotFoundError();
    }

    const [secretKey] = app.appSecretKeys;

    if (!secretKey) {
      throw new AppManagerAppSecretKeyNotFoundError();
    }

    return {
      app,
      secretKey,
    };
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

      // revoke existing secret key
      await tx
        .update(schema.appSecretKeys)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(schema.appSecretKeys.appId, app.id),
            isNull(schema.appSecretKeys.revokedAt),
          ),
        )
        .execute();

      const [appSecretKey] = await tx
        .insert(schema.appSecretKeys)
        .values({
          appId: app.id,
          secret,
        })
        .returning();

      if (!appSecretKey) {
        throw new AppManagerFailedToRefreshAppSecretError();
      }

      return {
        appSecretKey,
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
      orderBy(fields, operators) {
        return operators.desc(fields.createdAt);
      },
      limit,
      offset: (page - 1) * limit,
    });

    return {
      apps,
      pageInfo: {
        total: totalApps,
      },
    };
  }

  async updateApp(params: IAppManager_UpdateAppParams) {
    const { id, name } = UpdateAppParamsSchema.parse(params);

    return await this.db.transaction(async (tx) => {
      const [app] = await tx
        .update(schema.app)
        .set({ name, updatedAt: new Date() })
        .where(eq(schema.app.id, id))
        .returning()
        .execute();

      if (!app) {
        throw new AppManagerAppNotFoundError();
      }

      return { app };
    });
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
  secretKey: AppSecretKeysSelectType;
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
  appSecretKey: AppSecretKeysSelectType;
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
    total: number;
  };
};

const GetAppParamsSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
});

type IAppManager_GetAppParams = z.infer<typeof GetAppParamsSchema>;

type IAppManager_GetAppResult = {
  app: AppSelectType;
  secretKey: AppSecretKeysSelectType;
};

const UpdateAppParamsSchema = z.object({
  id: z.string().uuid(),
  name: z.string().nonempty().max(50),
});

type IAppManager_UpdateAppParams = z.infer<typeof UpdateAppParamsSchema>;

type IAppManager_UpdateAppResult = {
  app: AppSelectType;
};

export interface IAppManager {
  createApp: (
    params: IAppManager_CreateAppParams,
  ) => Promise<IAppManager_CreateAppResult>;

  deleteApp: (
    params: IAppManager_DeleteAppParams,
  ) => Promise<IAppManager_DeleteAppResult>;

  getApp: (
    params: IAppManager_GetAppParams,
  ) => Promise<IAppManager_GetAppResult>;

  listApps: (
    params: IAppManager_ListAppsParams,
  ) => Promise<IAppManager_ListAppsResult>;

  refreshAppSecret: (
    params: IAppManager_RefreshAppSecretParams,
  ) => Promise<IAppManager_RefreshAppSecretResult>;

  updateApp: (
    params: IAppManager_UpdateAppParams,
  ) => Promise<IAppManager_UpdateAppResult>;
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

export class AppManagerAppSecretKeyNotFoundError extends AppManagerError {
  constructor() {
    super("App secret key not found");
    this.name = "AppManagerAppSecretKeyNotFoundError";
  }
}
