import type { Hex } from "@ecp.eth/sdk/core";

type MiniAppConfig = {
  uri: string;
  appId: Hex;
  notificationUrl: string;
  notificationsIsolated: boolean;
  neynarApiKey?: string;
};

type RegisteredMiniApp = MiniAppConfig & {
  host: string;
};

type MiniAppConfigRegistryServiceOptions = {
  apps: Record<string, MiniAppConfig>;
};

export class MiniAppConfigRegistryService {
  private readonly apps: Record<string, RegisteredMiniApp>;
  private readonly appIdToApp: Record<Hex | "*", RegisteredMiniApp[]>;
  private readonly domainToApp: Record<string, RegisteredMiniApp>;

  constructor(options: MiniAppConfigRegistryServiceOptions) {
    this.apps = Object.entries(options.apps).reduce(
      (acc, [key, config]) => {
        acc[key] = {
          ...config,
          host: new URL(config.uri).host.toLowerCase(),
        };

        return acc;
      },
      {} as Record<string, RegisteredMiniApp>,
    );
    this.appIdToApp = {
      "*": [],
    };

    for (const [, app] of Object.entries(this.apps)) {
      const appId = app.appId.toLowerCase() as Hex;

      if (app.notificationsIsolated) {
        const appsById = this.appIdToApp[appId] ?? [];

        appsById.push(app);

        this.appIdToApp[appId] = appsById;
      } else {
        this.appIdToApp["*"].push(app);
      }
    }

    this.domainToApp = {};

    for (const [, app] of Object.entries(this.apps)) {
      if (this.domainToApp[app.host]) {
        throw new Error(
          `Duplicate host: ${app.host} for mini app: ${app.appId}`,
        );
      }

      this.domainToApp[app.host] = app;
    }
  }

  /**
   * Returns all apps that are configured to receive notifications for comments with given "app" property.
   *
   * @param app - The appId to get apps for. Use `*` to get apps that are configured to receive notifications for comments from any app.
   * @returns The apps that have the given appId.
   */
  getAppsByAppId(app: Hex | "*"): RegisteredMiniApp[] {
    if (app === "*") {
      return this.appIdToApp["*"];
    }

    return this.appIdToApp[app.toLowerCase() as Hex] ?? [];
  }

  getAllApps(): RegisteredMiniApp[] {
    return Object.values(this.apps);
  }

  getAppByHost(host: string): RegisteredMiniApp | undefined {
    return this.domainToApp[host.toLowerCase()];
  }
}
