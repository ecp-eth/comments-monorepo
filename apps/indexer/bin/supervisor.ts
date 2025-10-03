#!/usr/bin/env -S node --experimental-transform-types

/**
 * This supervisor script is used to start the indexer and its workers.
 *
 * It runs the indexer and its workers and if any of them crash it will kill all of them so railway can restart the whole service.
 *
 * It is just simple replacement for pm2 which is an overkill for this scenario.
 */
import { type ChildProcess, spawn } from "node:child_process";
import { type Readable } from "node:stream";
import readline from "node:readline";
import cron from "node-cron";

const GRACE_SHUTDOWN_DELAY_MS = 5000;
const INDEXER_URL =
  process.env.NODE_ENV === "production"
    ? "http://localhost:8080"
    : "http://localhost:42069";
const PROCESSES = [
  {
    name: "indexer",
    command: "pnpm",
    args: ["start"],
  },
  {
    name: "worker:fan-out",
    command: "pnpm",
    args: ["run", "worker:fan-out", "--indexer-url", INDEXER_URL],
  },
  {
    name: "worker:webhook-event-delivery",
    command: "pnpm",
    args: [
      "run",
      "worker:webhook-event-delivery",
      "--indexer-url",
      INDEXER_URL,
    ],
  },
];
const CRON_PROCESSES = [
  {
    name: "cron:comment-references-refresher",
    // run it on 3:30 pm on Monday, Wednesday, Friday and Sunday
    cron: "30 15 * * 1,3,5,7",
    command: "pnpm",
    args: [
      "run",
      "cron:comment-references-refresher",
      "--indexer-url",
      INDEXER_URL,
    ],
  },
];

const children = new Map<string, ChildProcess>();
let shuttingDown = false;

function prefixLogs(stream: Readable, prefix: string, isError = false) {
  const rl = readline.createInterface({
    input: stream,
  });

  rl.on("line", (line) => {
    console[isError ? "error" : "log"](`[${prefix}] ${line}`);
  });

  rl.on("close", () => {});

  return rl;
}

function killGroup(child: ChildProcess, signal: NodeJS.Signals) {
  try {
    process.kill(-child.pid!, signal);
  } catch (error) {
    console.error("[supervisor] failed to kill group", error);
  }
}

async function shutdownAll(exitCode = 1) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.error("[supervisor] shutting down all children...");

  for (const [, child] of children) {
    killGroup(child, "SIGTERM");
  }

  await new Promise((resolve) => setTimeout(resolve, GRACE_SHUTDOWN_DELAY_MS));

  for (const [, child] of children) {
    killGroup(child, "SIGKILL");
  }

  console.error("[supervisor] all children killed");

  process.exit(exitCode);
}

function spawnProcess(spec: (typeof PROCESSES)[number], killAllOnExit = false) {
  const child = spawn(spec.command, spec.args, {
    env: process.env,
    cwd: process.cwd(),
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  prefixLogs(child.stdout, spec.name);
  prefixLogs(child.stderr, spec.name);

  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }

    console.log(
      `[supervisor] ${spec.name} exited with code ${code}, signal ${signal}`,
    );

    if (killAllOnExit) {
      void shutdownAll(code ?? 1);
    }
  });

  children.set(spec.name, child);
  console.log(`[supervisor] spawned ${spec.name}, pid: ${child.pid}`);
}

process.on("uncaughtException", (err) => {
  console.error("[supervisor] uncaught exception", err);
  void shutdownAll(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[supervisor] unhandled rejection", reason, promise);
  void shutdownAll(1);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    console.log(`[supervisor] received ${signal}, shutting down...`);
    void shutdownAll(0);
  });
}

for (const spec of PROCESSES) {
  spawnProcess(spec, true);
}

for (const spec of CRON_PROCESSES) {
  console.log(`[supervisor] scheduling ${spec.name} cron job`);
  cron.schedule(spec.cron, () => {
    const existing = children.get(spec.name);
    if (
      existing &&
      existing.exitCode === null &&
      existing.signalCode === null
    ) {
      console.warn(
        `[supervisor] skipping ${spec.name} cron job because previous run is still active`,
      );
      return;
    }
    console.log(`[supervisor] running ${spec.name} cron job`);
    spawnProcess(spec);
  });
}
