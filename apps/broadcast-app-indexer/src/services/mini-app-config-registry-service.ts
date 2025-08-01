import type { Hex } from "@ecp.eth/sdk/core";

type MiniAppConfig = {
  uri: string;
  appId: Hex;
  notificationUrl: string;
  notificationsIsolated: boolean;
};

type MiniAppConfigRegistryServiceOptions = {
  apps: Record<string, MiniAppConfig>;
};

export class MiniAppConfigRegistryService {
  private readonly apps: Record<string, MiniAppConfig>;
  private readonly appIdToApp: Record<Hex | "*", MiniAppConfig[]>;

  constructor(options: MiniAppConfigRegistryServiceOptions) {
    this.apps = options.apps;
    this.appIdToApp = {
      "*": [],
    };

    for (const [, app] of Object.entries(this.apps)) {
      const appId = app.appId.toLowerCase() as Hex;

      if (!this.appIdToApp[appId]) {
        this.appIdToApp[appId] = [];
      }

      if (app.notificationsIsolated) {
        this.appIdToApp[appId]!.push(app);
      } else {
        this.appIdToApp["*"].push(app);
      }
    }
  }

  /**
   * Returns all apps that are configured to receive notifications for comments with given "app" property.
   *
   * @param app - The appId to get apps for. Use `*` to get apps that are configured to receive notifications for comments from any app.
   * @returns The apps that have the given appId.
   */
  getAppsByAppId(app: Hex | "*"): MiniAppConfig[] {
    if (app === "*") {
      return this.appIdToApp["*"];
    }

    return this.appIdToApp[app.toLowerCase() as Hex] ?? [];
  }

  getAllApps(): MiniAppConfig[] {
    return Object.values(this.apps);
  }
}
