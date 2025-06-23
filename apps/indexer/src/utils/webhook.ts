import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import { z } from "zod";

const webhookCallbackDataSchema = z.object({
  action: z.enum(["approve", "reject"]),
  commentId: HexSchema,
  timestamp: z.number().int().nonnegative(),
});

export type WebhookCallbackData = z.infer<typeof webhookCallbackDataSchema>;

// Maximum size constraint for webhook data
const MAX_WEBHOOK_DATA_SIZE = 64;

// Compact binary format for webhook data
function serializeWebhookData(data: WebhookCallbackData): Buffer {
  const actionByte = data.action === "approve" ? 0x01 : 0x02; // 1 B
  const commentIdBuffer = Buffer.from(data.commentId.slice(2), "hex"); // Remove "0x" prefix, 32 B
  const timestampBuffer = Buffer.alloc(4); // 4B
  // Convert milliseconds to seconds to fit in 32-bit unsigned integer
  const timestampInSeconds = Math.floor(data.timestamp / 1000);

  timestampBuffer.writeUInt32BE(timestampInSeconds);

  // 37 B
  return Buffer.concat([
    Buffer.from([actionByte]),
    commentIdBuffer,
    timestampBuffer,
  ]);
}

function deserializeWebhookData(buffer: Buffer): WebhookCallbackData {
  const actionByte = buffer[0];
  const action = actionByte === 0x01 ? "approve" : "reject";
  const commentId = ("0x" +
    buffer.subarray(1, 33).toString("hex")) as `0x${string}`;
  const timestampInSeconds = buffer.readUInt32BE(33);
  // Convert seconds back to milliseconds
  const timestamp = timestampInSeconds * 1000;

  return { action, commentId, timestamp };
}

export function encryptWebhookCallbackData(
  secret: string,
  data: WebhookCallbackData,
): string {
  // Serialize data to compact binary format
  const serializedData = serializeWebhookData(data);

  // Create a deterministic key from the secret for XOR encryption
  const keyBuffer = Buffer.from(secret.padEnd(32, "0").slice(0, 32), "utf8");

  // XOR encrypt the data
  const encrypted = Buffer.alloc(serializedData.length);

  for (let i = 0; i < serializedData.length; i++) {
    encrypted[i] =
      (serializedData[i] ?? 0) ^ (keyBuffer[i % keyBuffer.length] ?? 0);
  }

  // Check size constraint
  if (encrypted.length > MAX_WEBHOOK_DATA_SIZE) {
    throw new Error(
      `Webhook data too large: ${encrypted.length} bytes (max: ${MAX_WEBHOOK_DATA_SIZE})`,
    );
  }

  return encrypted.toString("binary");
}

export function decryptWebhookCallbackData(
  secret: string,
  data: string,
): WebhookCallbackData {
  const encrypted = Buffer.from(data, "binary");

  // Check size constraint
  if (encrypted.length > MAX_WEBHOOK_DATA_SIZE) {
    throw new Error(
      `Webhook data too large: ${encrypted.length} bytes (max: ${MAX_WEBHOOK_DATA_SIZE})`,
    );
  }

  // Create the same deterministic key from the secret
  const keyBuffer = Buffer.from(secret.padEnd(32, "0").slice(0, 32), "utf8");

  // XOR decrypt the data
  const decrypted = Buffer.alloc(encrypted.length);

  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = (encrypted[i] ?? 0) ^ (keyBuffer[i % keyBuffer.length] ?? 0);
  }

  // Deserialize the binary data
  const webhookData = deserializeWebhookData(decrypted);

  // Validate with schema
  return webhookCallbackDataSchema.parse(webhookData);
}
