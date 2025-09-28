import { Command } from "commander";
import { z } from "zod";

export const workerCommand = new Command()
  .option("--no-wait-for-indexer", "Do not wait for indexer to be ready")
  .option(
    "-i, --indexer-url <url>",
    "The URL of the indexer",
    (value) => z.string().url().parse(value),
    "http://localhost:42069",
  );

type WorkerCommandOptions = {
  waitForIndexer: boolean;
  indexerUrl: string;
};

export function parseWorkerCommandOptions<ExtraOptions = object>(
  command: Command = workerCommand,
): WorkerCommandOptions & ExtraOptions {
  return command.parse().opts<WorkerCommandOptions & ExtraOptions>();
}
