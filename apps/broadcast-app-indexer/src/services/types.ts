import { Hex } from "@ecp.eth/sdk/core";

export type NotificationDetails = {
  /**
   * Title of the notification.
   *
   * Must be between 1 and 32 characters long.
   */
  title: string;
  /**
   * Body of the notification.
   *
   * Must be between 1 and 128 characters long.
   */
  body: string;
  /**
   * Target URL of the notification.
   *
   * Must be a valid URL and at most 256 characters long.
   */
  targetUrl: string;
};

export interface INotificationsService {
  notify: (
    subscribers: number[],
    commentId: Hex,
    details: NotificationDetails,
  ) => Promise<void>;

  process(): Promise<void>;

  abort(): void;
}
