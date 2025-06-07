import { keccak256, stringToBytes, stringToHex, toHex } from "viem";
import type { Hex } from "../core/schemas.js";
import type { JsonObject, MetadataEntry } from "./types.js";

/**
 * Creates a metadata key by encoding a string in the format "type key"
 *
 * @param keyString - The key string (e.g., "status", "author", "url")
 * @param valueType - The type of the value (e.g., "string", "bool", "uint256")
 * @returns The keccak256 hash of the UTF-8 encoded "type key" string
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

/**
 * Type representing the supported on-chain serializable types
 */
export type MetadataType =
  | "string"
  | "bool"
  | "uint256"
  | "address"
  | "bytes32"
  | "bytes"
  | "uint8"
  | "uint16"
  | "uint32"
  | "uint64"
  | "uint128"
  | "int256"
  | "int128";

/**
 * JS/SDK/Indexer format for metadata storage
 */
export type MetadataRecord = Record<
  string,
  {
    key: string;
    type: MetadataType;
    value: Hex;
  }
>;

/**
 * Converts from JS/SDK Record format to contract MetadataEntry array format
 *
 * @param metadataRecord - The metadata in Record format
 * @returns Array of MetadataEntry for contract use
 */
export function convertRecordToContractFormat(
  metadataRecord: MetadataRecord,
): MetadataEntry[] {
  return Object.entries(metadataRecord).map(([, metadata]) => ({
    key: createMetadataKey(metadata.key, metadata.type),
    value: metadata.value,
  }));
}

/**
 * Converts from contract MetadataEntry array format to JS/SDK Record format
 * Note: This requires knowledge of the original key string and type, which are lost
 * in the contract format. This function attempts to reverse-engineer them from
 * common patterns used in the codebase.
 *
 * @param metadataEntries - Array of MetadataEntry from contracts
 * @param keyTypeMap - Optional mapping of known keys to their original string and type
 * @returns The metadata in Record format
 */
export function convertContractToRecordFormat(
  metadataEntries: MetadataEntry[],
  keyTypeMap?: Record<Hex, { key: string; type: MetadataType }>,
): MetadataRecord {
  const result: MetadataRecord = {};

  for (const entry of metadataEntries) {
    const keyHex = entry.key;

    // Try to find the original key and type from the provided map
    const originalKeyType = keyTypeMap?.[keyHex];

    if (originalKeyType) {
      // Use the provided mapping
      const recordKey = `${originalKeyType.type} ${originalKeyType.key}`;
      result[recordKey] = {
        key: originalKeyType.key,
        type: originalKeyType.type,
        value: entry.value,
      };
    } else {
      // Fallback: create a generic key since we can't reverse the hash
      // In practice, applications should maintain their own key mappings
      const recordKey = `${keyHex}`;
      result[recordKey] = {
        key: keyHex, // Use the hash as the key
        type: "bytes", // Default to bytes type
        value: entry.value,
      };
    }
  }

  return result;
}

/**
 * Helper function to create a key-type mapping for known metadata keys
 * This should be maintained by applications to properly convert from contract format
 *
 * @param knownKeys - Array of known key-type pairs
 * @returns Mapping from hashed key to original key and type
 */
export function createKeyTypeMap(
  knownKeys: Array<{ key: string; type: MetadataType }>,
): Record<Hex, { key: string; type: MetadataType }> {
  const map: Record<Hex, { key: string; type: MetadataType }> = {};

  for (const keyType of knownKeys) {
    const hashedKey = createMetadataKey(keyType.key, keyType.type);
    map[hashedKey] = keyType;
  }

  return map;
}

/**
 * Convenience function to convert metadata for sending to contracts
 * Handles both Record format and direct MetadataEntry array
 *
 * @param metadata - Metadata in either Record or MetadataEntry array format
 * @returns MetadataEntry array ready for contract calls
 */
export function prepareMetadataForContract(
  metadata: MetadataRecord | MetadataEntry[],
): MetadataEntry[] {
  if (Array.isArray(metadata)) {
    return metadata; // Already in contract format
  }
  return convertRecordToContractFormat(metadata);
}

/**
 * Convenience function to convert metadata from contracts for JS/SDK use
 *
 * @param metadata - MetadataEntry array from contract
 * @param keyTypeMap - Optional mapping of known keys
 * @returns Metadata in Record format
 */
export function parseMetadataFromContract(
  metadata: MetadataEntry[],
  keyTypeMap?: Record<Hex, { key: string; type: MetadataType }>,
): MetadataRecord {
  return convertContractToRecordFormat(metadata, keyTypeMap);
}
