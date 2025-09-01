import { domainManifestSchema } from "@farcaster/miniapp-sdk";
import z from "zod";
import { serverEnv } from "../../../env/server";

type DomainManifest = z.infer<typeof domainManifestSchema>;

export async function GET() {
  return Response.json(
    domainManifestSchema.parse({
      accountAssociation: {
        header:
          serverEnv.FARCASTER_MINI_APP_MANIFEST_ACCOUNT_ASSOCIATION_HEADER,
        payload:
          serverEnv.FARCASTER_MINI_APP_MANIFEST_ACCOUNT_ASSOCIATION_PAYLOAD,
        signature:
          serverEnv.FARCASTER_MINI_APP_MANIFEST_ACCOUNT_ASSOCIATION_SIGNATURE,
      },
      frame: {
        version: "1",
        name: serverEnv.FARCASTER_MINI_APP_NAME,
        homeUrl: serverEnv.FARCASTER_MINI_APP_URL,
        iconUrl: new URL(
          "/icon.png",
          serverEnv.FARCASTER_MINI_APP_URL,
        ).toString(),
        splashImageUrl: new URL(
          "/splash.png",
          serverEnv.FARCASTER_MINI_APP_URL,
        ).toString(),
        splashBackgroundColor: "#ffffff",
        primaryCategory: "social",
        requiredCapabilities: [
          "actions.ready",
          "wallet.getEthereumProvider",
          "actions.signIn",
          "back",
        ],
        requiredChains:
          process.env.NODE_ENV === "production" ? ["eip155:8453"] : undefined,
        webhookUrl: serverEnv.FARCASTER_MINI_APP_WEBHOOK_URL,
      },
    } satisfies DomainManifest),
  );
}
