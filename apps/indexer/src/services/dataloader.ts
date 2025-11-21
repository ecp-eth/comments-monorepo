import BaseDataLoader, { type Options } from "dataloader";
import type { MetricsService } from "./metrics";

export type DataLoaderOptions<K, V, C = K> = Options<K, V, C> & {
  name: string;
  metrics: MetricsService;
};

export class DataLoader<K, V, C = K> extends BaseDataLoader<K, V, C> {
  constructor(
    batchFn: (keys: readonly K[]) => PromiseLike<ArrayLike<V | Error>>,
    options: DataLoaderOptions<K, V, C>,
  ) {
    super(
      async function dataloaderTrackedBatchFn(keys) {
        const observeDuration =
          options.metrics.dataloaderBatchDuration.startTimer({
            dataloader_name: options.name,
          });

        options.metrics.dataloaderBatchSize.observe(
          { dataloader_name: options.name },
          keys.length,
        );

        try {
          const result = await batchFn(keys);

          let errorCount = 0;
          let outcome: "success" | "partial" | "error" = "success";

          for (const item of Array.from(result)) {
            if (item instanceof Error) {
              errorCount++;
              outcome = "partial";
            }
          }

          if (errorCount === result.length) {
            outcome = "error";
          }

          observeDuration({ outcome });

          options.metrics.dataloaderBatchesTotal.inc({
            dataloader_name: options.name,
            outcome,
          });

          options.metrics.dataloaderItemsTotal.inc(
            {
              dataloader_name: options.name,
              outcome,
            },
            result.length - errorCount,
          );

          return result;
        } catch (error) {
          observeDuration({ outcome: "error" });

          options.metrics.dataloaderBatchesTotal.inc({
            dataloader_name: options.name,
            outcome: "error",
          });

          options.metrics.dataloaderItemsTotal.inc(
            {
              dataloader_name: options.name,
              outcome: "error",
            },
            1,
          );

          throw error;
        }
      },
      {
        ...options,
        cacheMap: createCacheMap(options),
      },
    );
  }
}

function createCacheMap<K, V, C>(
  options: DataLoaderOptions<K, V, C>,
): DataLoaderOptions<K, V, C>["cacheMap"] {
  const cacheMap: DataLoaderOptions<K, V, C>["cacheMap"] =
    options.cacheMap || new Map<C, Promise<V>>();

  return {
    get(key: C) {
      const value = cacheMap.get(key);

      if (value === undefined) {
        options.metrics.dataloaderCacheMissesTotal.inc({
          dataloader_name: options.name,
        });
      } else {
        options.metrics.dataloaderCacheHitsTotal.inc({
          dataloader_name: options.name,
        });
      }

      return value;
    },
    set(key: C, value: Promise<V>) {
      cacheMap.set(key, value);
    },
    delete(key: C) {
      cacheMap.delete(key);
    },
    clear() {
      cacheMap.clear();
    },
  };
}
