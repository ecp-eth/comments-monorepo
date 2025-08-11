import { eq } from "drizzle-orm";
import { db as dbService } from "../../services";
import { schema } from "../../../schema";
import type { Hex } from "viem";

export class ManagementAuthService {
  constructor(private db: typeof dbService) {}

  async getPublicKey(keyId: Hex): Promise<string | null> {
    const key = await this.db.query.apiKeys.findFirst({
      where: eq(schema.apiKeys.id, keyId),
    });

    if (!key) {
      return null;
    }

    await this.db
      .update(schema.apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(schema.apiKeys.id, keyId))
      .execute();

    return key.publicKey;
  }
}
