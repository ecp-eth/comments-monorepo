import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import { z } from "zod";

const webhookCallbackDataSchema = z.object({
  action: z.enum(["approve", "reject", "pending", "change", "cancel"]),
  commentId: HexSchema,
  timestamp: z.number().int().nonnegative(),
});

function getActionByte(action: WebhookCallbackData["action"]) {
  switch (action) {
    case "approve":
      return 0x01;
    case "reject":
      return 0x02;
    case "pending":
      return 0x03;
    case "change":
      return 0x04;
    case "cancel":
      return 0x05;
    default:
      throw new Error(`Invalid action: ${action}`);
  }
}

function getActionFromByte(actionByte: number) {
  switch (actionByte) {
    case 0x01:
      return "approve";
    case 0x02:
      return "reject";
    case 0x03:
      return "pending";
    case 0x04:
      return "change";
    case 0x05:
      return "cancel";
    default:
      throw new Error(`Invalid action byte: ${actionByte}`);
  }
}

export type WebhookCallbackData = z.infer<typeof webhookCallbackDataSchema>;

// Maximum size constraint for webhook data
const MAX_WEBHOOK_DATA_SIZE = 64;

// Compact binary format for webhook data
function serializeWebhookData(data: WebhookCallbackData): Buffer {
  const actionByte = getActionByte(data.action); // 1 B
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
  const actionByte = buffer[0] ?? -1;
  const action = getActionFromByte(actionByte);
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
