import type { AppSelectType } from "../../schema.offchain.ts";
import type { DB } from "./db.ts";

type AppKeyAuthServiceOptions = {
  db: DB;
};

export class AppKeyAuthService implements IAppKeyAuthService {
  private readonly options: AppKeyAuthServiceOptions;

  constructor(options: AppKeyAuthServiceOptions) {
    this.options = options;
  }

  async verifyAppKey(appKey: string): Promise<{
    app: AppSelectType;
  }> {
    const appSecretKey = await this.options.db.query.appSecretKeys.findFirst({
      where(fields, operators) {
        return operators.and(
          operators.eq(fields.secret, appKey),
          operators.isNull(fields.revokedAt),
        );
      },
      with: {
        app: true,
      },
    });

    if (!appSecretKey) {
      throw new AppKeyAuthService_InvalidAppKeyError();
    }

    return {
      app: appSecretKey.app,
    };
  }
}

export interface IAppKeyAuthService {
  /**
   * Verify the app key and return the app
   * @param appKey
   * @returns
   *
   * @throws AppKeyAuthService_InvalidAppKeyError
   */
  verifyAppKey: (appKey: string) => Promise<{
    app: AppSelectType;
  }>;
}

export class AppKeyAuthServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppKeyAuthServiceError";
  }
}

export class AppKeyAuthService_InvalidAppKeyError extends AppKeyAuthServiceError {
  constructor() {
    super("Invalid app key");
    this.name = "AppKeyAuthService_InvalidAppKeyError";
  }
}
