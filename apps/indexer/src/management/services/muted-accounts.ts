import { getAddress, Hex } from "viem";
import { getIndexerDb } from "../db";
import type { MutedAccountSelect } from "../migrations";

function normalizeAddress(address: Hex): Hex {
  return getAddress(address);
}

export async function muteAccount(
  address: Hex,
  reason?: string,
): Promise<boolean> {
  const db = getIndexerDb();

  const muted = await db
    .insertInto("muted_accounts")
    .values({ account: normalizeAddress(address), reason })
    .onConflict((oc) => oc.column("account").doNothing())
    .returningAll()
    .executeTakeFirst();

  return !!muted;
}

export async function unmuteAccount(address: Hex): Promise<boolean> {
  const db = getIndexerDb();

  const result = await db
    .deleteFrom("muted_accounts")
    .where("account", "=", normalizeAddress(address))
    .returningAll()
    .executeTakeFirst();

  return !!result;
}

export async function getMutedAccount(
  address: Hex,
): Promise<MutedAccountSelect | undefined> {
  const db = getIndexerDb();

  const muted = await db
    .selectFrom("muted_accounts")
    .selectAll()
    .where("account", "=", normalizeAddress(address))
    .limit(1)
    .executeTakeFirst();

  return muted;
}
