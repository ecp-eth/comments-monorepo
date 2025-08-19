import { type OpenAPIHono, z } from "@hono/zod-openapi";
import {
  BadRequestResponse,
  FarcasterSettingsUpdateResponse,
  InternalServerErrorResponse,
  NotFoundResponse,
} from "../../../../../shared-responses";
import { db } from "../../../../../../services";
import { schema } from "../../../../../../../schema";
import { HexSchema } from "@ecp.eth/sdk/core";
import { siweMiddleware } from "../../../../../middleware/siwe";

export async function farcasterSettingsPUT(api: OpenAPIHono): Promise<void> {
  api.openapi(
    {
      method: "put",
      path: "/api/apps/:appId/farcaster/:clientFid/settings",
      tags: ["Farcaster"],
      description:
        "Creates or updates farcaster notifications settings for a user",
      middleware: siweMiddleware,
      request: {
        params: z.object({
          appId: HexSchema,
          clientFid: z.coerce.number().int(),
        }),
        body: {
          content: {
            "application/json": {
              schema: z.object({
                userFid: z.number(),
                notificationsEnabled: z.boolean().default(false),
              }),
            },
          },
          required: true,
        },
      },
      responses: {
        201: {
          description: "Successfully created notifications settings",
          content: {
            "application/json": {
              schema: FarcasterSettingsUpdateResponse,
            },
          },
        },
        400: {
          description: "Bad request",
          content: {
            "application/json": {
              schema: BadRequestResponse,
            },
          },
        },
        404: {
          description: "Channel not found or not subscribed to the channel",
          content: {
            "application/json": {
              schema: NotFoundResponse,
            },
          },
        },
        500: {
          description: "Internal server error",
          content: {
            "application/json": {
              schema: InternalServerErrorResponse,
            },
          },
        },
      },
    },
    async (c) => {
      const { appId, clientFid } = c.req.valid("param");
      const { userFid, notificationsEnabled } = c.req.valid("json");

      const [settings] = await db
        .insert(schema.userFarcasterMiniAppSettings)
        .values({
          appId,
          clientFid,
          userAddress: c.get("user")!.address,
          userFid,
          notificationsEnabled,
        })
        .onConflictDoUpdate({
          target: [
            schema.userFarcasterMiniAppSettings.appId,
            schema.userFarcasterMiniAppSettings.clientFid,
            schema.userFarcasterMiniAppSettings.userAddress,
            schema.userFarcasterMiniAppSettings.userFid,
          ],
          set: {
            notificationsEnabled,
            updatedAt: new Date(),
          },
        })
        .returning()
        .execute();

      if (!settings) {
        throw new Error("Failed to create notification settings");
      }

      // hono doesn't run response schema validations therefore we need to validate the response manually
      // which also works as formatter for bigints, etc
      return c.json(
        FarcasterSettingsUpdateResponse.parse({
          userFid: settings.userFid,
          notificationsEnabled: settings.notificationsEnabled,
        }),
        201,
      );
    },
  );
}
