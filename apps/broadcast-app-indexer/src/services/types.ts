import type { Event } from "ponder:registry";
import type { ChannelSelectType } from "../../ponder.schema";

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

export type INotificationsService_NotifyArgs = {
  comment: Event<"CommentManager:CommentAdded">["args"];
  channel: ChannelSelectType;
};

export interface INotificationsService {
  notify: (args: INotificationsService_NotifyArgs) => Promise<void>;

  process(): Promise<void>;

  abort(): void;
}
