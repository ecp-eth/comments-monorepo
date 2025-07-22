import type { Hex } from "@ecp.eth/sdk/core";
import type { INotificationsService, NotificationDetails } from "./types";

export class NoopNotificationsService implements INotificationsService {
  async notify(
    subscribers: number[],
    commentId: Hex,
    details: NotificationDetails,
  ): Promise<void> {
    console.log(
      `NoopNotificationsService: notify called with subscribers: ${subscribers.length}, commentId: ${commentId}, details: ${JSON.stringify(details)}`,
    );
  }

  async process(): Promise<void> {
    console.log("NoopNotificationsService: process called");
  }

  abort(): void {
    console.log("NoopNotificationsService: abort called");
  }
}
