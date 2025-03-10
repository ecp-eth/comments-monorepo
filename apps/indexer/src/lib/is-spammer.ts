import type { Hex } from "viem";
import { getIndexerDb } from "../management/db";

export async function isSpammer(address: Hex): Promise<boolean> {
  const db = getIndexerDb();

  const spamAccount = await db
    .selectFrom("spam_accounts")
    .selectAll()
    .where("account", "=", address)
    .limit(1)
    .executeTakeFirst();

  return !!spamAccount;
}
