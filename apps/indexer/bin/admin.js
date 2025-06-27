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
import { renderToMarkdown } from "@ecp.eth/shared/renderer";

const HexSchema = z.string().regex(/^0x[0-9a-fA-F]+$/);

/**
 * @param {import('viem').Hex} privateKey
 * @param {string} method
 * @param {URL} url
 * @param {string} body
 * @param {number} timestamp
 * @returns {Promise<string>}
 */
async function createRequestSignature(
  privateKey,
  method,
  url,
  body,
  timestamp,
) {
  const message = new TextEncoder().encode(
    `${method}${url.pathname}${url.searchParams.toString()}${timestamp}${body}`,
  );
  const signature = await signAsync(message, privateKey);

  return Buffer.from(signature).toString("hex");
}

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
    process.env.DATABASE_URL,
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

const mutedAccounts = new Command("muted-accounts")
  .description("Manage muted accounts")
  .requiredOption("-i, --id <id>", "The ID of the API key to use")
  .requiredOption("-k, --private-key <key>", "The private key of the API key")
  .option(
    "-u, --url <url>",
    "The URL of indexer",
    urlOptionValidator,
    "https://api.ethcomments.xyz",
  );

program.addCommand(mutedAccounts);

mutedAccounts
  .command("mute")
  .description("Mutes account")
  .option("-r, --reason <reason>", "The reason for muting the account")
  .argument("<address>", "The address of the account", (val) => {
    const parsed = HexSchema.safeParse(val);

    if (!parsed.success) {
      throw new InvalidArgumentError("Invalid address");
    }

    return parsed.data;
  })
  .action(async (address) => {
    const { id, privateKey, url, reason } = mutedAccounts.opts();

    try {
      const body = JSON.stringify({ address, reason });
      const timestamp = Date.now();
      const endpointUrl = new URL(`/api/muted-accounts`, url);

      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": id,
          "X-API-Timestamp": timestamp.toString(),
          "X-API-Signature": await createRequestSignature(
            privateKey,
            "POST",
            endpointUrl,
            body,
            timestamp,
          ),
        },
        body,
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Failed to mute account:", error);
        process.exit(1);
      }

      console.log("Successfully muted account:", address);
    } catch (error) {
      console.error("Failed to mute account:", error);
      process.exit(1);
    }
  });

mutedAccounts
  .command("unmute")
  .description("Unmutes account")
  .argument("<address>", "The address of the muted account")
  .action(async (address) => {
    const { id, privateKey, url } = mutedAccounts.opts();

    try {
      const timestamp = Date.now();
      const endpointUrl = new URL(`/api/muted-accounts/${address}`, url);

      const response = await fetch(endpointUrl, {
        method: "DELETE",
        headers: {
          "X-API-Key": id,
          "X-API-Timestamp": timestamp.toString(),
          "X-API-Signature": await createRequestSignature(
            privateKey,
            "DELETE",
            endpointUrl,
            "",
            timestamp,
          ),
        },
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Failed to unmute account:", error);
        process.exit(1);
      }

      console.log("Successfully unmuted account:", address);
    } catch (error) {
      console.error("Failed to unmute account:", error);
      process.exit(1);
    }
  });

const moderateComments = new Command("moderate-comments")
  .description("Manage comment moderation")
  .requiredOption("-i, --id <id>", "The ID of the API key to use")
  .requiredOption("-k, --private-key <key>", "The private key of the API key")
  .option(
    "-u, --url <url>",
    "The URL of indexer",
    urlOptionValidator,
    "https://api.ethcomments.xyz",
  );

program.addCommand(moderateComments);

moderateComments
  .command("approve")
  .description("Approves a pending comment")
  .argument("<commentId>", "The ID of the comment to approve")
  .action(async (commentId) => {
    const { id, privateKey, url } = moderateComments.opts();

    try {
      const timestamp = Date.now();
      const endpointUrl = new URL(`/api/moderate-comments/${commentId}`, url);
      const body = JSON.stringify({
        moderationStatus: "approved",
      });

      const response = await fetch(endpointUrl, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": id,
          "X-API-Timestamp": timestamp.toString(),
          "X-API-Signature": await createRequestSignature(
            privateKey,
            "PATCH",
            endpointUrl,
            body,
            timestamp,
          ),
        },
        body,
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Failed to approve comment:", error);
        process.exit(1);
      }

      console.log("Successfully approved comment:", commentId);
    } catch (error) {
      console.error("Failed to approve comment:", error);
      process.exit(1);
    }
  });

moderateComments
  .command("reject")
  .description("Rejects a pending comment")
  .argument("<commentId>", "The ID of the comment to reject")
  .action(async (commentId) => {
    const { id, privateKey, url } = moderateComments.opts();

    try {
      const timestamp = Date.now();
      const endpointUrl = new URL(`/api/moderate-comments/${commentId}`, url);
      const body = JSON.stringify({
        moderationStatus: "rejected",
      });

      const response = await fetch(endpointUrl, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": id,
          "X-API-Timestamp": timestamp.toString(),
          "X-API-Signature": await createRequestSignature(
            privateKey,
            "PATCH",
            endpointUrl,
            body,
            timestamp,
          ),
        },
        body,
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Failed to reject comment:", error);
        process.exit(1);
      }

      console.log("Successfully rejected comment:", commentId);
    } catch (error) {
      console.error("Failed to reject comment:", error);
      process.exit(1);
    }
  });

moderateComments
  .command("list")
  .description("Lists pending comments")
  .action(async () => {
    const { id, privateKey, url } = moderateComments.opts();

    try {
      const timestamp = Date.now();
      const endpointUrl = new URL(`/api/moderate-comments`, url);

      const response = await fetch(endpointUrl, {
        headers: {
          "X-API-Key": id,
          "X-API-Timestamp": timestamp.toString(),
          "X-API-Signature": await createRequestSignature(
            privateKey,
            "GET",
            endpointUrl,
            "",
            timestamp,
          ),
        },
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Failed to list pending comments:", error);
        process.exit(1);
      }

      /**
       * @type {any}
       */
      const rawResponse = await response.json();
      /**
       * @type {import('@ecp.eth/sdk/indexer/schemas').IndexerAPIListCommentsSchemaType}
       */
      const result = rawResponse;

      if (!result.extra.moderationEnabled) {
        console.error("Moderation is not enabled on this instance");
        process.exit(1);
      }

      for (const comment of result.results) {
        console.group(comment.id);
        console.table([
          {
            "Comment ID": comment.id,
            "Created At": comment.createdAt,
            "Updated At": comment.updatedAt,
            "Chain ID": comment.chainId,
            "Author (address)": comment.author.address,
            "Author (ENS)": comment.author.ens?.name,
            "Author (FC)": comment.author.farcaster?.username,
          },
        ]);

        console.log("Content----------");
        console.log(
          renderToMarkdown({
            content: comment.content,
            references: comment.references,
          }).result,
        );
        console.log("----------");
        console.groupEnd();
      }
    } catch (error) {
      console.error("Failed to list pending comments:", error);
      process.exit(1);
    }
  });

program.parse(process.argv);
