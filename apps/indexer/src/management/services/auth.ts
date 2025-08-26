import { eq } from "drizzle-orm";
import type { DB } from "../../services/db.ts";
import { schema } from "../../../schema.ts";

export class ManagementAuthService {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  async getPublicKey(keyId: string): Promise<string | null> {
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
