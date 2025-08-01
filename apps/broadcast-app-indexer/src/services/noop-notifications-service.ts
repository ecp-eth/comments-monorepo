import type {
  INotificationsService,
  INotificationsService_NotifyArgs,
} from "./types";

export class NoopNotificationsService implements INotificationsService {
  async notify(args: INotificationsService_NotifyArgs): Promise<void> {
    console.log(`NoopNotificationsService: notify called`, args);
  }

  async process(): Promise<void> {
    console.log("NoopNotificationsService: process called");
  }

  abort(): void {
    console.log("NoopNotificationsService: abort called");
  }
}
