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

const GRACE_SHUTDOWN_DELAY_MS = 5000;
const PROCESSES = [
  {
    name: "indexer",
    command: "pnpm",
    args: ["start"],
  },
  {
    name: "worker:fan-out",
    command: "pnpm",
    args: ["run", "worker:fan-out"],
  },
  {
    name: "worker:webhook-event-delivery",
    command: "pnpm",
    args: ["run", "worker:webhook-event-delivery"],
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

function spawnProcess(spec: (typeof PROCESSES)[number]) {
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

    shutdownAll(code ?? 1);
  });

  children.set(spec.name, child);
  console.log(`[supervisor] spawned ${spec.name}, pid: ${child.pid}`);
}

process.on("uncaughtException", (err) => {
  console.error("[supervisor] uncaught exception", err);
  shutdownAll(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[supervisor] unhandled rejection", reason, promise);
  shutdownAll(1);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    console.log(`[supervisor] received ${signal}, shutting down...`);
    shutdownAll(0);
  });
}

for (const spec of PROCESSES) {
  spawnProcess(spec);
}
