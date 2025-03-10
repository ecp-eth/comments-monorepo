import { getAddress, Hex } from "viem";
import { getIndexerDb } from "../db";

function normalizeAddress(address: Hex): Hex {
  return getAddress(address);
}

export async function addSpammer(address: Hex): Promise<boolean> {
  const db = getIndexerDb();

  const spammer = await db
    .insertInto("spam_accounts")
    .values({ account: normalizeAddress(address) })
    .onConflict((oc) => oc.column("account").doNothing())
    .returningAll()
    .executeTakeFirst();

  return !!spammer;
}

export async function removeSpammer(address: Hex): Promise<boolean> {
  const db = getIndexerDb();

  const result = await db
    .deleteFrom("spam_accounts")
    .where("account", "=", normalizeAddress(address))
    .returningAll()
    .executeTakeFirst();

  return !!result;
}

export async function isSpammer(address: Hex): Promise<boolean> {
  const db = getIndexerDb();

  const spammer = await db
    .selectFrom("spam_accounts")
    .selectAll()
    .where("account", "=", normalizeAddress(address))
    .limit(1)
    .executeTakeFirst();

  return !!spammer;
}
