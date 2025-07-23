export type Channel = {
  id: bigint;
  name: string;
  description: string | null;
  isSubscribed: boolean;
  notificationsEnabled: boolean;
};
