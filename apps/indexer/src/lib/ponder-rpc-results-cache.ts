import { createHash } from "node:crypto";
import { getDb } from "../db";
import { toHex } from "viem";

export async function deleteCachedGetBlockRpcResponse(
  blockNumber: bigint,
  chainId: number
) {
  const db = getDb();

  if (!db) {
    throw new Error("Database not found");
  }

  await db
    .deleteFrom("rpc_request_results")
    .where("request_hash", "=", createRequestHash(blockNumber))
    .where("chain_id", "=", chainId)
    .execute();
}

/**
 * This function removes cached result from rpc response because we aren't interested in the result anymore
 */
export async function markCachedGetBlockRpcResponseAsSkipped(
  blockNumber: bigint,
  chainId: number
) {
  const db = getDb();

  if (!db) {
    return;
  }

  await db
    .updateTable("rpc_request_results")
    .set({ result: "" })
    .where("request_hash", "=", createRequestHash(blockNumber))
    .where("chain_id", "=", chainId)
    .execute();
}

/**
 *
 * @param blockNumber
 * @param chainId
 * @returns
 */
export async function getCachedGetBlockRpcResponseSkipStatus(
  blockNumber: bigint,
  chainId: number
): Promise<"skipped" | "not_skipped" | "not_found"> {
  const db = getDb();

  if (!db) {
    return "not_found";
  }

  const row = await db
    .selectFrom("rpc_request_results")
    .select("result")
    .where("chain_id", "=", chainId)
    .where("request_hash", "=", createRequestHash(blockNumber))
    .limit(1)
    .executeTakeFirst();

  if (!row) {
    return "not_found";
  }

  return row.result === "" ? "skipped" : "not_skipped";
}

function createRequestHash(blockNumber: bigint): string {
  return createHash("md5")
    .update(
      JSON.stringify({
        method: "eth_getblockbynumber",
        params: [toHex(blockNumber), true],
      })
    )
    .digest()
    .toString("hex");
}
