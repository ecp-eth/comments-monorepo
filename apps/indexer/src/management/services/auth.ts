import { Kysely } from "kysely";
import type { IndexerSchemaDB } from "../migrations";

export class ManagementAuthService {
  constructor(private db: Kysely<IndexerSchemaDB>) {}

  async getPublicKey(keyId: string): Promise<string | null> {
    const key = await this.db
      .selectFrom("api_keys")
      .select("public_key")
      .where("id", "=", keyId)
      .executeTakeFirst();

    if (!key) {
      return null;
    }

    await this.db
      .updateTable("api_keys")
      .set({ last_used_at: new Date() })
      .where("id", "=", keyId)
      .execute();

    return key.public_key;
  }
}
