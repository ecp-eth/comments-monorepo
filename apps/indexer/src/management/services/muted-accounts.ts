import { getAddress, type Hex } from "viem";
import type { DB } from "../../services/db.ts";
import type { MutedAccountSelectType } from "../../../schema.offchain.ts";
import { schema } from "../../../schema.ts";
import { eq } from "drizzle-orm";

function normalizeAddress(address: Hex): Hex {
  return getAddress(address);
}

export class MutedAccountsManagementService {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  async muteAccount(address: Hex, reason?: string): Promise<boolean> {
    const [muted] = await this.db
      .insert(schema.mutedAccounts)
      .values({
        account: normalizeAddress(address),
        reason,
      })
      .onConflictDoNothing({
        target: [schema.mutedAccounts.account],
      })
      .returning()
      .execute();

    return !!muted;
  }

  async unmuteAccount(address: Hex): Promise<boolean> {
    const [result] = await this.db
      .delete(schema.mutedAccounts)
      .where(eq(schema.mutedAccounts.account, normalizeAddress(address)))
      .returning()
      .execute();

    return !!result;
  }

  async getMutedAccount(
    address: Hex,
  ): Promise<MutedAccountSelectType | undefined> {
    const muted = await this.db.query.mutedAccounts
      .findFirst({
        where: eq(schema.mutedAccounts.account, normalizeAddress(address)),
      })
      .execute();

    return muted;
  }
}
