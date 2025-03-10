#!/usr/bin/env node

import process from "node:process";
import { Buffer } from "node:buffer";
import console from "node:console";
import { TextEncoder } from "node:util";
import { Command, InvalidArgumentError } from "commander";
import { Kysely, PostgresDialect, WithSchemaPlugin } from "kysely";
import { randomBytes } from "crypto";
import { getPublicKeyAsync, signAsync, utils } from "@noble/ed25519";
import pg from "pg";
import { z } from "zod";

const HexSchema = z.string().regex(/^0x[0-9a-fA-F]+$/);

/**
 * Validates a URL option.
 * @param {string} val - The value to validate.
 * @returns {string} The validated value.
 */
function urlOptionValidator(val) {
  const parsed = z.string().url().safeParse(val);

  if (!parsed.success) {
    throw new InvalidArgumentError("Invalid URL");
  }

  return parsed.data;
}

/**
 * Creates a Kysely instance for the given database URL.
 * @param {string} dbUrl - The database URL to connect to.
 *
 * @returns {Kysely<import('../src/management/migrations').IndexerSchemaDB>} A Kysely instance.
 */
function getDb(dbUrl) {
  return new Kysely({
    dialect: new PostgresDialect({
      pool: new pg.Pool({ connectionString: dbUrl }),
    }),
    plugins: [new WithSchemaPlugin("ecp_indexer_schema")],
  });
}

const program = new Command();

program.name("admin").description("Management CLI for the indexer service");

const auth = new Command("auth");

const authAccount = new Command("accounts")
  .description("Manage accounts")
  .requiredOption(
    "-d, --db-url <url>",
    "Database URL (defaults to DATABASE_URL)",
    urlOptionValidator,
    process.env.DATABASE_URL
  );

auth.addCommand(authAccount);
program.addCommand(auth);

authAccount
  .command("add")
  .description("Add a new API key")
  .argument("<name>", "The name of the API key")
  .action(async (name) => {
    const db = getDb(authAccount.opts().dbUrl);
    const privateKey = utils.randomPrivateKey();
    const publicKey = await getPublicKeyAsync(privateKey);
    const id = randomBytes(16).toString("hex");

    const result = await db
      .insertInto("api_keys")
      .values({
        id,
        name,
        public_key: Buffer.from(publicKey).toString("hex"),
        created_at: new Date(),
      })
      .onConflict((oc) => oc.column("name").doNothing())
      .returningAll()
      .executeTakeFirst();

    if (!result) {
      console.log("Failed to add API key, already exists");
    } else {
      console.table({
        ID: id,
        Name: name,
        "Private key": Buffer.from(privateKey).toString("hex"),
        "Public key": Buffer.from(publicKey).toString("hex"),
      });
    }

    await db.destroy();
  });

authAccount
  .command("delete <id>")
  .description("Delete an API key")
  .action(async (id) => {
    const db = getDb(authAccount.opts().dbUrl);

    const deleted = await db
      .deleteFrom("api_keys")
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();

    if (!deleted) {
      console.log("API key not found");
    } else {
      console.log("API key deleted");
    }

    await db.destroy();
  });

authAccount
  .command("list")
  .description("List all API keys")
  .action(async () => {
    const db = getDb(authAccount.opts().dbUrl);

    const keys = await db
      .selectFrom("api_keys")
      .select(["id", "created_at", "last_used_at"])
      .execute();

    if (keys.length === 0) {
      console.log("No API keys found");
    } else {
      console.table(keys);
    }

    await db.destroy();
  });

const spammers = new Command("spammers")
  .description("Manage spammers")
  .requiredOption("-i, --id <id>", "The ID of the API key to use")
  .requiredOption("-k, --private-key <key>", "The private key of the API key")
  .option(
    "-u, --url <url>",
    "The URL of indexer",
    urlOptionValidator,
    "https://api.ethcomments.xyz"
  );

program.addCommand(spammers);

spammers
  .command("add")
  .description("Add a new spammer")
  .argument("<address>", "The address of the spammer", (val) => {
    const parsed = HexSchema.safeParse(val);

    if (!parsed.success) {
      throw new InvalidArgumentError("Invalid address");
    }

    return parsed.data;
  })
  .action(async (address) => {
    const { id, privateKey, url } = spammers.opts();

    try {
      const body = JSON.stringify({ address });
      const timestamp = Date.now().toString();
      const message = new TextEncoder().encode(
        `POST/api/spam-accounts${timestamp}${body}`
      );
      const signature = await signAsync(message, privateKey);

      const response = await fetch(`${url}/api/spam-accounts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": id,
          "X-API-Timestamp": timestamp,
          "X-API-Signature": Buffer.from(signature).toString("hex"),
        },
        body,
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Failed to add spammer:", error);
        process.exit(1);
      }

      console.log("Successfully added spammer:", address);
    } catch (error) {
      console.error("Failed to add spammer:", error);
      process.exit(1);
    }
  });

spammers
  .command("remove")
  .description("Remove a spammer")
  .argument("<address>", "The address of the spammer")
  .action(async (address) => {
    const { id, privateKey, url } = spammers.opts();

    try {
      const timestamp = Date.now().toString();
      const message = new TextEncoder().encode(
        `DELETE/api/spam-accounts/${address}${timestamp}`
      );
      const signature = await signAsync(message, privateKey);

      const response = await fetch(`${url}/api/spam-accounts/${address}`, {
        method: "DELETE",
        headers: {
          "X-API-Key": id,
          "X-API-Timestamp": timestamp,
          "X-API-Signature": Buffer.from(signature).toString("hex"),
        },
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Failed to remove spammer:", error);
        process.exit(1);
      }

      console.log("Successfully removed spammer:", address);
    } catch (error) {
      console.error("Failed to remove spammer:", error);
      process.exit(1);
    }
  });

program.parse(process.argv);
