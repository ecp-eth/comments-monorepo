import {
  QueryCacheNotifyEvent,
  QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { useEffect } from "react";
import {
  IndexerAPIListCommentsWithPendingOperationsSchema,
  IndexerAPIListCommentsWithPendingOperationsSchemaType,
} from "./schemas";

export function useMonitorListCommentsCache(
  client: QueryClient,
  queryKey: QueryKey,
  {
    enabled,
    onUpdate,
  }: {
    enabled: boolean;
    onUpdate: (
      data: IndexerAPIListCommentsWithPendingOperationsSchemaType,
    ) => void;
  },
) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const queryCache = client.getQueryCache();
    const handleSubscribe = (event: QueryCacheNotifyEvent) => {
      if (event.type !== "updated") {
        return;
      }

      const query = event.query;

      if (queryKey.join("/") !== query.queryKey.join("/")) {
        return;
      }

      const parsed =
        IndexerAPIListCommentsWithPendingOperationsSchema.safeParse(
          query.state.data,
        );
      if (!parsed.success) {
        return;
      }

      onUpdate(parsed.data);
    };

    return queryCache.subscribe(handleSubscribe);
  }, [client, enabled, onUpdate, queryKey]);
}
