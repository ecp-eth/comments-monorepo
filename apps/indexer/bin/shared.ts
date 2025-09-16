import { Command } from "commander";
import { z } from "zod";

const workerCommand = new Command()
  .option("--no-wait-for-indexer", "Do not wait for indexer to be ready")
  .option(
    "-i, --indexer-url <url>",
    "The URL of the indexer",
    (value) => z.string().url().parse(value),
    "https://localhost:42069",
  );

type WorkerCommandOptions = {
  waitForIndexer: boolean;
  indexerUrl: string;
};

export function parseWorkerCommandOptions(): WorkerCommandOptions {
  return workerCommand.parse().opts<WorkerCommandOptions>();
}
