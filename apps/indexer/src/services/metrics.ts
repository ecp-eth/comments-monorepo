import client from "prom-client";

export class MetricsService {
  public readonly registry: client.Registry;
  public readonly dataloaderBatchDuration: client.Histogram<
    "dataloader_name" | "outcome"
  >;
  public readonly dataloaderBatchSize: client.Histogram<"dataloader_name">;
  public readonly dataloaderBatchesTotal: client.Counter<
    "dataloader_name" | "outcome"
  >;
  public readonly dataloaderItemsTotal: client.Counter<
    "dataloader_name" | "outcome"
  >;
  public readonly dataloaderCacheHitsTotal: client.Counter<"dataloader_name">;
  public readonly dataloaderCacheMissesTotal: client.Counter<"dataloader_name">;

  constructor() {
    this.registry = new client.Registry();
    this.dataloaderBatchDuration = new client.Histogram({
      name: "dataloader_batch_duration_seconds",
      help: "The duration of a dataloader batch",
      labelNames: ["dataloader_name", "outcome"],
      buckets: [
        0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60,
      ],
      registers: [this.registry],
    });
    this.dataloaderBatchSize = new client.Histogram({
      name: "dataloader_batch_size",
      help: "The size of the batch for a dataloader",
      labelNames: ["dataloader_name"],
      buckets: [1, 2, 4, 8, 16, 32, 64],
      registers: [this.registry],
    });
    this.dataloaderBatchesTotal = new client.Counter({
      name: "dataloader_batches_total",
      help: "The total number of batches for a dataloader",
      labelNames: ["dataloader_name", "outcome"],
      registers: [this.registry],
    });
    this.dataloaderItemsTotal = new client.Counter({
      name: "dataloader_items_total",
      help: "The total number of items resolved by a dataloader",
      labelNames: ["dataloader_name", "outcome"],
      registers: [this.registry],
    });
    this.dataloaderCacheHitsTotal = new client.Counter({
      name: "dataloader_cache_hits_total",
      help: "The total number of cache hits for a dataloader",
      labelNames: ["dataloader_name"],
      registers: [this.registry],
    });
    this.dataloaderCacheMissesTotal = new client.Counter({
      name: "dataloader_cache_misses_total",
      help: "The total number of cache misses for a dataloader",
      labelNames: ["dataloader_name"],
      registers: [this.registry],
    });
  }

  getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}

export const metrics = new MetricsService();
