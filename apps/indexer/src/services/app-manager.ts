import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import crypto from "node:crypto";
import { z } from "zod";
import { schema } from "../../schema";
import type {
  AppSelectType,
  AppSigningKeysSelectType,
} from "../../schema.offchain";
import { and, eq } from "drizzle-orm";

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

      const secret = crypto.randomBytes(32).toString("hex");

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
        throw new AppManagerFailedToDeleteAppError();
      }

      return {
        app,
      };
    });
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

export interface IAppManager {
  createApp: (
    params: IAppManager_CreateAppParams,
  ) => Promise<IAppManager_CreateAppResult>;

  deleteApp: (
    params: IAppManager_DeleteAppParams,
  ) => Promise<IAppManager_DeleteAppResult>;
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

export class AppManagerFailedToDeleteAppError extends AppManagerError {
  constructor() {
    super("Failed to delete app");
    this.name = "AppManagerFailedToDeleteAppError";
  }
}
