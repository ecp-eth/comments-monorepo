import { createClient, type Client } from "@farcaster/quick-auth";
import { HonoRequest } from "hono";
import { MiniAppConfigRegistryService } from "./mini-app-config-registry-service";
import z from "zod";

type FarcasterQuickAuthOptions = {
  /**
   * Allowed URIs to verify requests from.
   *
   * These are used to match hostnames by farcaster quick auth when verifying jwt tokens.
   */
  miniAppConfigRegistryService: MiniAppConfigRegistryService;
};

export class FarcasterQuickAuthService {
  private readonly client: Client;
  private readonly allowedHostnames: Set<string>;

  constructor(options: FarcasterQuickAuthOptions) {
    this.client = createClient();

    this.allowedHostnames = new Set(
      options.miniAppConfigRegistryService
        .getAllApps()
        .map((app) => new URL(app.uri).hostname.toLowerCase()),
    );
  }

  async verifyAndDecodeRequest(token: string, req: HonoRequest) {
    const originResult = z
      .string()
      .url()
      .safeParse(req.header("Origin") || req.header("X-MINI-APP-URL"));

    if (!originResult.success) {
      throw new FarcasterQuickAuthInvalidOriginError(
        originResult.error.message,
      );
    }

    const domain = new URL(originResult.data).hostname.toLowerCase();

    if (!this.allowedHostnames.has(domain)) {
      throw new FarcasterQuickAuthInvalidHostnameError(domain);
    }

    const payload = await this.client.verifyJwt({
      token,
      domain,
    });

    return payload;
  }
}

export class FarcasterQuickAuthInvalidHostnameError extends Error {
  constructor(domain: string) {
    super(`FarcasterQuickAuth: Invalid hostname: ${domain}`);
  }
}

export class FarcasterQuickAuthInvalidOriginError extends Error {
  constructor(origin: string) {
    super(`FarcasterQuickAuth: Invalid origin: ${origin}`);
  }
}
