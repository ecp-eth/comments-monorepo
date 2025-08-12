import { randomUUID } from "node:crypto";
import { describe, it, expect } from "vitest";
import {
  encryptWebhookCallbackData,
  decryptWebhookCallbackData,
} from "../../src/utils/webhook";
import type { WebhookCallbackData } from "../../src/utils/webhook";

function getKeyBuffer(secret: string): Buffer {
  return Buffer.from(secret.padEnd(32, "0").slice(0, 32), "utf8");
}

function xorWithKey(buffer: Buffer, key: Buffer): Buffer {
  const out = Buffer.alloc(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    out[i] = (buffer[i] ?? 0) ^ (key[i % key.length] ?? 0);
  }
  return out;
}

describe("webhook utils serialize/deserialize", () => {
  it("deserializes moderation payload correctly (build binary → encrypt → decrypt)", () => {
    const secret = "s3cr3t";
    const key = getKeyBuffer(secret);

    const actionByte = 0x01; // moderation-set-as-approved
    const commentId = ("0x" + "11".repeat(32)) as `0x${string}`; // 32 bytes
    const idBuffer = Buffer.from(commentId.slice(2), "hex");
    const timestampMs = 1712345678000; // divisible by 1000
    const timestampSeconds = Math.floor(timestampMs / 1000);
    const timestampBuffer = Buffer.alloc(4);
    timestampBuffer.writeUInt32BE(timestampSeconds);
    const revision = 42;
    const revisionBuffer = Buffer.alloc(2);
    revisionBuffer.writeUInt16BE(revision);

    const serialized = Buffer.concat([
      Buffer.from([actionByte]),
      idBuffer,
      timestampBuffer,
      revisionBuffer,
    ]);

    expect(serialized.length).toBe(39);

    // Encrypt exactly like the implementation (XOR + binary string)
    const encrypted = xorWithKey(serialized, key).toString("binary");

    const result = decryptWebhookCallbackData(secret, encrypted);
    expect(result).toEqual({
      action: "moderation-set-as-approved",
      commentId,
      timestamp: timestampSeconds * 1000,
      commentRevision: revision,
    });
  });

  it("serializes moderation payload correctly (encrypt → decrypt locally and inspect)", () => {
    const secret = "s3cr3t";
    const key = getKeyBuffer(secret);

    const data = {
      action: "moderation-set-as-rejected" as const,
      commentId: ("0x" + "22".repeat(32)) as `0x${string}`,
      timestamp: 1712000000000, // divisible by 1000
      commentRevision: 655, // fits in 2 bytes
    };

    const encryptedStr = encryptWebhookCallbackData(secret, data);
    const encrypted = Buffer.from(encryptedStr, "binary");
    expect(encrypted.length).toBe(39);

    const serialized = xorWithKey(encrypted, key);
    expect(serialized.length).toBe(39);

    const actionByte = serialized[0];
    expect(actionByte).toBe(0x02); // moderation-set-as-rejected

    const idHex = "0x" + serialized.subarray(1, 33).toString("hex");
    expect(idHex).toBe(data.commentId);

    const tsSeconds = serialized.readUInt32BE(33);
    expect(tsSeconds).toBe(Math.floor(data.timestamp / 1000));

    const revision = serialized.readUInt16BE(37);
    expect(revision).toBe(data.commentRevision);
  });

  it("deserializes report payload correctly (build binary with zero revision → encrypt → decrypt)", () => {
    const secret = "another-secret";
    const key = getKeyBuffer(secret);

    const actionByte = 0x06; // report-set-as-resolved
    const reportId = randomUUID();
    const idBuffer = Buffer.from(reportId);
    const timestampMs = 1720000000000;
    const tsSeconds = Math.floor(timestampMs / 1000);
    const timestampBuffer = Buffer.alloc(4);
    timestampBuffer.writeUInt32BE(tsSeconds);
    const revisionZero = Buffer.alloc(2); // zero-filled for report

    const serialized = Buffer.concat([
      Buffer.from([actionByte]),
      idBuffer,
      timestampBuffer,
      revisionZero,
    ]);

    expect(serialized.length).toBe(43);

    const encrypted = xorWithKey(serialized, key).toString("binary");
    const result = decryptWebhookCallbackData(secret, encrypted);
    expect(result).toEqual({
      action: "report-set-as-resolved",
      reportId,
      timestamp: tsSeconds * 1000,
    });
  });

  it("serializes report payload with zeroed revision bytes (encrypt → inspect)", () => {
    const secret = "another-secret";
    const key = getKeyBuffer(secret);

    const data: WebhookCallbackData = {
      action: "report-change-status" as const,
      reportId: randomUUID(),
      timestamp: 1730000000000,
    };

    const encryptedStr = encryptWebhookCallbackData(secret, data);
    const encrypted = Buffer.from(encryptedStr, "binary");
    expect(encrypted.length).toBe(43);

    const serialized = xorWithKey(encrypted, key);
    expect(serialized.length).toBe(43);

    const actionByte = serialized[0];
    expect(actionByte).toBe(0x08); // report-change-status

    const idHex = serialized.subarray(1, 37).toString("ascii");
    expect(idHex).toBe(data.reportId);

    const tsSeconds = serialized.readUInt32BE(37);
    expect(tsSeconds).toBe(Math.floor(data.timestamp / 1000));

    // Last two bytes should be zeros for report payloads
    expect(serialized.readUInt16BE(41)).toBe(0);
  });
});
