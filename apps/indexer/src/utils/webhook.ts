import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import { z } from "zod";

const moderationActionWebhookCallbackDataSchema = z.object({
  action: z.enum([
    "moderation-set-as-approved",
    "moderation-set-as-rejected",
    "moderation-set-as-pending",
    "moderation-change-status",
    "moderation-cancel",
  ]),
  commentId: HexSchema,
  commentRevision: z.number().int().nonnegative().max(65535),
  timestamp: z.number().int().nonnegative(),
});

const reportActionWebhookCallbackDataSchema = z.object({
  action: z.enum([
    "report-set-as-resolved",
    "report-set-as-closed",
    "report-change-status",
    "report-set-as-pending",
    "report-cancel",
  ]),
  reportId: HexSchema,
  timestamp: z.number().int().nonnegative(),
});

const webhookCallbackDataSchema = z.discriminatedUnion("action", [
  moderationActionWebhookCallbackDataSchema,
  reportActionWebhookCallbackDataSchema,
]);

function getActionByte(action: WebhookCallbackData["action"]) {
  switch (action) {
    case "moderation-set-as-approved":
      return 0x01;
    case "moderation-set-as-rejected":
      return 0x02;
    case "moderation-set-as-pending":
      return 0x03;
    case "moderation-change-status":
      return 0x04;
    case "moderation-cancel":
      return 0x05;
    case "report-set-as-resolved":
      return 0x06;
    case "report-set-as-closed":
      return 0x07;
    case "report-change-status":
      return 0x08;
    case "report-set-as-pending":
      return 0x09;
    case "report-cancel":
      return 0x0a;

    default:
      throw new Error(`Invalid action: ${action}`);
  }
}

function getActionFromByte(actionByte: number) {
  switch (actionByte) {
    case 0x01:
      return "moderation-set-as-approved";
    case 0x02:
      return "moderation-set-as-rejected";
    case 0x03:
      return "moderation-set-as-pending";
    case 0x04:
      return "moderation-change-status";
    case 0x05:
      return "moderation-cancel";
    case 0x06:
      return "report-set-as-resolved";
    case 0x07:
      return "report-set-as-closed";
    case 0x08:
      return "report-change-status";
    case 0x09:
      return "report-set-as-pending";
    case 0x0a:
      return "report-cancel";
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
  const idBuffer = Buffer.from(
    "commentId" in data ? data.commentId.slice(2) : data.reportId.slice(2),
    "hex",
  ); // Remove "0x" prefix, 32 B
  const timestampBuffer = Buffer.alloc(4); // 4B
  // Convert milliseconds to seconds to fit in 32-bit unsigned integer
  const timestampInSeconds = Math.floor(data.timestamp / 1000);
  timestampBuffer.writeUInt32BE(timestampInSeconds);

  let commentRevisionBuffer = Buffer.alloc(2);

  if ("commentRevision" in data) {
    commentRevisionBuffer = Buffer.alloc(2);
    commentRevisionBuffer.writeUInt16BE(data.commentRevision);
  }

  // 39 B
  return Buffer.concat([
    Buffer.from([actionByte]),
    idBuffer,
    timestampBuffer,
    commentRevisionBuffer,
  ]);
}

function deserializeWebhookData(buffer: Buffer): WebhookCallbackData {
  const actionByte = buffer[0] ?? -1;
  const action = getActionFromByte(actionByte);
  const id = ("0x" + buffer.subarray(1, 33).toString("hex")) as `0x${string}`;
  const timestampInSeconds = buffer.readUInt32BE(33);
  const commentRevision = buffer.readUint16BE(37);
  // Convert seconds back to milliseconds
  const timestamp = timestampInSeconds * 1000;

  switch (action) {
    case "moderation-cancel":
    case "moderation-change-status":
    case "moderation-set-as-approved":
    case "moderation-set-as-pending":
    case "moderation-set-as-rejected":
      return { action, commentId: id, timestamp, commentRevision };
    case "report-cancel":
    case "report-change-status":
    case "report-set-as-resolved":
    case "report-set-as-closed":
    case "report-set-as-pending":
      return { action, reportId: id, timestamp };
    default:
      throw new Error(`Invalid action: ${action}`);
  }
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
