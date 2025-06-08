import { stringToHex, toHex, pad } from "viem";
import type { Hex } from "../core/schemas.js";
import type { Json, JsonObject, MetadataEntry } from "./types.js";

/**
 * Creates a metadata key by encoding a string in the format "type key" using abi.encodePacked
 *
 * @param keyString - The key string (e.g., "status", "author", "url")
 * @param valueType - The type of the value MetadataType
 * @returns The keccak256 hash of the abi.encodePacked "type key" string
 */
export function createMetadataKey(
  keyString: string,
  valueType: MetadataType,
): Hex {
  const keyTypeString = `${valueType} ${keyString}`;

  // Check if the UTF-8 encoded key exceeds 32 bytes
  const keyBytes = new TextEncoder().encode(keyTypeString);
  if (keyBytes.length > 32) {
    throw new Error(
      `Metadata key "${keyTypeString}" exceeds maximum length of 32 bytes`,
    );
  }

  // Convert to hex and pad to exactly 32 bytes
  const hexString = stringToHex(keyTypeString);
  return pad(hexString, { size: 32 });
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
  // Handle negative numbers using two's complement
  if (typeof value === "number" && value < 0) {
    // Convert to bigint for proper two's complement handling
    const bigintValue = BigInt(value);
    // Use two's complement: for a 256-bit number, this is 2^256 + value
    const twosComplement = (1n << 256n) + bigintValue;
    return toHex(twosComplement, { size: 32 });
  } else if (typeof value === "bigint" && value < 0n) {
    // Two's complement for bigint negative values
    const twosComplement = (1n << 256n) + value;
    return toHex(twosComplement, { size: 32 });
  } else {
    // Positive numbers work as before
    return toHex(value, { size: 32 });
  }
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
 * Creates a metadata entry from a key-value pair with explicit type specification
 *
 * @param keyString - The key string
 * @param valueType - The metadata type (string, bool, uint256, etc.)
 * @param value - The value (string, boolean, number, bigint, or JsonObject)
 * @returns The MetadataEntry
 */
export function createMetadataEntry(
  keyString: string,
  valueType: MetadataType,
  value: string | boolean | number | bigint | JsonObject,
): MetadataEntry {
  if (valueType === "string") {
    if (typeof value === "string") {
      return {
        key: createMetadataKey(keyString, valueType),
        value: encodeStringValue(value),
      };
    } else if (typeof value === "object" && value !== null) {
      return {
        key: createMetadataKey(keyString, valueType),
        value: encodeJsonValue(value),
      };
    } else {
      throw new Error(
        `Value must be string or object for string type, got ${typeof value}`,
      );
    }
  } else if (valueType === "bool") {
    if (typeof value !== "boolean") {
      throw new Error(
        `Value must be boolean for bool type, got ${typeof value}`,
      );
    }
    return {
      key: createMetadataKey(keyString, valueType),
      value: encodeBoolValue(value),
    };
  } else if (
    valueType === "uint256" ||
    valueType === "uint8" ||
    valueType === "uint16" ||
    valueType === "uint32" ||
    valueType === "uint64" ||
    valueType === "uint128" ||
    valueType === "int256" ||
    valueType === "int128"
  ) {
    if (typeof value !== "number" && typeof value !== "bigint") {
      throw new Error(
        `Value must be number or bigint for ${valueType} type, got ${typeof value}`,
      );
    }
    return {
      key: createMetadataKey(keyString, valueType),
      value: encodeNumberValue(value),
    };
  } else {
    throw new Error(`Unsupported metadata type: ${valueType}`);
  }
}

/**
 * Creates multiple metadata entries from an object with explicit types
 *
 * @param metadata - An object with key-value pairs and their types
 * @returns Array of MetadataEntry
 */
export function createMetadataEntries(
  metadata: Record<
    string,
    {
      type: MetadataType;
      value: string | boolean | number | bigint | JsonObject;
    }
  >,
): MetadataEntry[] {
  return Object.entries(metadata).map(([key, { type, value }]) =>
    createMetadataEntry(key, type, value),
  );
}

/**
 * Creates a metadata entry with a custom type
 *
 * @param keyString - The key string
 * @param valueType - The type string MetadataType
 * @param encodedValue - The pre-encoded value as hex
 * @returns The MetadataEntry
 */
export function createCustomMetadataEntry(
  keyString: string,
  valueType: MetadataType,
  encodedValue: Hex,
): MetadataEntry {
  return {
    key: createMetadataKey(keyString, valueType),
    value: encodedValue,
  };
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
 * Constants object for MetadataType values - provides runtime access to all metadata types
 */
export const MetadataTypeValues = {
  STRING: "string" as const,
  BOOL: "bool" as const,
  UINT256: "uint256" as const,
  ADDRESS: "address" as const,
  BYTES32: "bytes32" as const,
  BYTES: "bytes" as const,
  UINT8: "uint8" as const,
  UINT16: "uint16" as const,
  UINT32: "uint32" as const,
  UINT64: "uint64" as const,
  UINT128: "uint128" as const,
  INT256: "int256" as const,
  INT128: "int128" as const,
} as const;

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
        type: MetadataTypeValues.BYTES, // Default to bytes type
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

/**
 * Decodes metadata types from on-chain metadata entries by reverse-engineering
 * the type information from the encoded key field. Works without requiring
 * prior knowledge of the key-type mappings.
 *
 * @param metadataEntries - Array of MetadataEntry from contracts
 * @returns Mapping from hashed key to original key and type information
 */
export function decodeMetadataTypes(
  metadataEntries: MetadataEntry[],
): Record<Hex, { key: string; type: MetadataType }> {
  const map: Record<Hex, { key: string; type: MetadataType }> = {};

  for (const entry of metadataEntries) {
    try {
      // The key is padded to 32 bytes with null bytes
      // We need to convert to bytes array, find actual content length, then convert back
      const keyBytes = new Uint8Array(
        entry.key
          .slice(2)
          .match(/.{2}/g)
          ?.map((byte) => parseInt(byte, 16)) || [],
      );

      // Find the last non-zero byte
      let actualLength = keyBytes.length;
      while (actualLength > 0 && keyBytes[actualLength - 1] === 0) {
        actualLength--;
      }

      // Extract only the actual content
      const actualBytes = keyBytes.slice(0, actualLength);

      // Convert back to string
      const keyString = new TextDecoder().decode(actualBytes);

      // Filter out null bytes and trim the string
      const cleanKeyString = keyString.replace(/\0/g, "").trim();

      // Parse the format "type key" to extract type and original key
      const spaceIndex = cleanKeyString.indexOf(" ");

      if (spaceIndex > 0) {
        const type = cleanKeyString
          .substring(0, spaceIndex)
          .trim() as MetadataType;
        const originalKey = cleanKeyString.substring(spaceIndex + 1).trim();

        // Validate it's a known MetadataType using the constants object values
        if (Object.values(MetadataTypeValues).includes(type)) {
          map[entry.key] = { key: originalKey, type };
        }
      }
    } catch (error) {
      // If we can't parse the key, skip it
      console.warn(`Could not parse metadata key ${entry.key}:`, error);
    }
  }

  return map;
}

/**
 * Decodes a string value from encoded metadata bytes
 *
 * @param encodedValue - The hex-encoded bytes
 * @returns The decoded string value
 */
export function decodeStringValue(encodedValue: Hex): string | Json {
  // For strings, we need to handle both regular strings and JSON objects
  try {
    const decoded = new TextDecoder().decode(
      new Uint8Array(
        encodedValue
          .slice(2)
          .match(/.{2}/g)
          ?.map((byte) => parseInt(byte, 16)) || [],
      ),
    );

    // Try to parse as JSON first (for objects), fall back to string
    try {
      return JSON.parse(decoded);
    } catch {
      return decoded;
    }
  } catch {
    return "";
  }
}

/**
 * Decodes a boolean value from encoded metadata bytes
 *
 * @param encodedValue - The hex-encoded bytes (32 bytes, 1 for true, 0 for false)
 * @returns The decoded boolean value
 */
export function decodeBoolValue(encodedValue: Hex): boolean {
  try {
    // Convert hex to bigint and check if it's 1 (true) or 0 (false)
    const value = BigInt(encodedValue);
    return value === 1n;
  } catch {
    return false;
  }
}

/**
 * Decodes a number value from encoded metadata bytes
 *
 * @param encodedValue - The hex-encoded bytes (32 bytes big-endian)
 * @param isSigned - Whether the number is signed (for two's complement handling)
 * @returns The decoded number value (as bigint for safety)
 */
export function decodeNumberValue(
  encodedValue: Hex,
  isSigned: boolean = false,
): bigint {
  try {
    const value = BigInt(encodedValue);

    if (isSigned && value > (1n << 255n) - 1n) {
      // Handle two's complement for negative numbers
      return value - (1n << 256n);
    }

    return value;
  } catch {
    return 0n;
  }
}

/**
 * Decodes an address value from encoded metadata bytes
 *
 * @param encodedValue - The hex-encoded address
 * @returns The decoded address as hex string
 */
export function decodeAddressValue(encodedValue: Hex): Hex {
  // Addresses are stored as-is in hex format
  return encodedValue as Hex;
}

/**
 * Decodes a bytes value from encoded metadata bytes
 *
 * @param encodedValue - The hex-encoded bytes
 * @returns The decoded bytes as hex string
 */
export function decodeBytesValue(encodedValue: Hex): Hex {
  // Bytes are stored as-is in hex format
  return encodedValue as Hex;
}

/**
 * Decodes a metadata entry value based on its type
 *
 * @param entry - The metadata entry to decode
 * @param type - The metadata type for proper decoding
 * @returns The decoded value in its original JavaScript type
 */
export function decodeMetadataValue(
  entry: MetadataEntry,
  type: MetadataType,
): string | boolean | bigint | Hex | Json {
  switch (type) {
    case "string":
      return decodeStringValue(entry.value);
    case "bool":
      return decodeBoolValue(entry.value);
    case "uint8":
    case "uint16":
    case "uint32":
    case "uint64":
    case "uint128":
    case "uint256":
      return decodeNumberValue(entry.value, false);
    case "int128":
    case "int256":
      return decodeNumberValue(entry.value, true);
    case "address":
      return decodeAddressValue(entry.value);
    case "bytes32":
    case "bytes":
      return decodeBytesValue(entry.value);
    default:
      return entry.value; // Return raw hex for unknown types
  }
}
