import { getAddress, Hex } from "viem";
import type { DB } from "../../services/db";
import type { MutedAccountSelectType } from "../../../schema.offchain";
import { schema } from "../../../schema";
import { eq } from "drizzle-orm";

function normalizeAddress(address: Hex): Hex {
  return getAddress(address);
}

export class MutedAccountsManagementService {
  constructor(private db: DB) {}

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
    const result = await this.db
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
