import { keccak256, stringToBytes, stringToHex, toHex } from "viem";
import type { Hex } from "../core/schemas.js";
import type { JsonObject, MetadataEntry } from "./types.js";

/**
 * Creates a metadata key by encoding a string in the format "key type"
 *
 * @param keyString - The key string (e.g., "status", "author", "url")
 * @param valueType - The type of the value (e.g., "string", "bool", "uint256")
 * @returns The keccak256 hash of the UTF-8 encoded "key type" string
 */
export function createMetadataKey(keyString: string, valueType: string): Hex {
  const keyTypeString = `${keyString} ${valueType}`;
  return keccak256(stringToBytes(keyTypeString));
}

/**
 * Encodes a string value as bytes for metadata
 *
 * @param value - The string value to encode
 * @returns The hex-encoded bytes
 */
export function encodeStringValue(value: string): Hex {
  return stringToHex(value);
}

/**
 * Encodes a boolean value as bytes for metadata
 *
 * @param value - The boolean value to encode
 * @returns The hex-encoded bytes (32 bytes, 1 for true, 0 for false)
 */
export function encodeBoolValue(value: boolean): Hex {
  return toHex(value ? 1 : 0, { size: 32 });
}

/**
 * Encodes a number value as bytes for metadata
 *
 * @param value - The number value to encode
 * @returns The hex-encoded bytes (32 bytes big-endian)
 */
export function encodeNumberValue(value: number | bigint): Hex {
  return toHex(value, { size: 32 });
}

/**
 * Encodes a JSON object as bytes for metadata
 *
 * @param value - The JSON object to encode
 * @returns The hex-encoded bytes of the JSON string
 */
export function encodeJsonValue(value: JsonObject): Hex {
  return stringToHex(JSON.stringify(value));
}

/**
 * Creates a metadata entry from a key-value pair with automatic type detection
 *
 * @param keyString - The key string
 * @param value - The value (string, boolean, number, bigint, or JsonObject)
 * @returns The MetadataEntry
 */
export function createMetadataEntry(
  keyString: string,
  value: string | boolean | number | bigint | JsonObject,
): MetadataEntry {
  if (typeof value === "string") {
    return {
      key: createMetadataKey(keyString, "string"),
      value: encodeStringValue(value),
    };
  } else if (typeof value === "boolean") {
    return {
      key: createMetadataKey(keyString, "bool"),
      value: encodeBoolValue(value),
    };
  } else if (typeof value === "number" || typeof value === "bigint") {
    return {
      key: createMetadataKey(keyString, "uint256"),
      value: encodeNumberValue(value),
    };
  } else if (typeof value === "object" && value !== null) {
    return {
      key: createMetadataKey(keyString, "string"),
      value: encodeJsonValue(value),
    };
  } else {
    throw new Error(`Unsupported metadata value type: ${typeof value}`);
  }
}

/**
 * Creates multiple metadata entries from an object
 *
 * @param metadata - An object with key-value pairs
 * @returns Array of MetadataEntry
 */
export function createMetadataEntries(
  metadata: Record<string, string | boolean | number | bigint | JsonObject>,
): MetadataEntry[] {
  return Object.entries(metadata).map(([key, value]) =>
    createMetadataEntry(key, value),
  );
}

/**
 * Creates a metadata entry with a custom type
 *
 * @param keyString - The key string
 * @param valueType - The type string (e.g., "address", "bytes32")
 * @param encodedValue - The pre-encoded value as hex
 * @returns The MetadataEntry
 */
export function createCustomMetadataEntry(
  keyString: string,
  valueType: string,
  encodedValue: Hex,
): MetadataEntry {
  return {
    key: createMetadataKey(keyString, valueType),
    value: encodedValue,
  };
}

/**
 * Utility to convert legacy JSON metadata to MetadataEntry array
 *
 * @param jsonMetadata - The JSON metadata object
 * @returns Array of MetadataEntry
 */
export function convertJsonMetadataToEntries(
  jsonMetadata: JsonObject,
): MetadataEntry[] {
  // Filter out null values and nested objects/arrays that we can't easily convert
  const filteredEntries = Object.entries(jsonMetadata).filter(
    ([, value]) =>
      value !== null &&
      (typeof value === "string" ||
        typeof value === "boolean" ||
        typeof value === "number" ||
        (typeof value === "object" && !Array.isArray(value))),
  ) as Array<[string, string | boolean | number | JsonObject]>;

  return filteredEntries.map(([key, value]) => createMetadataEntry(key, value));
}
