import {
  stringToHex,
  toHex,
  pad,
  hexToString,
  isAddress,
  isHex,
  size,
} from "viem";
import type { Hex } from "../core/schemas.js";
import type { Json, JsonObject, MetadataEntry } from "./types.js";

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
 *
 * The keys is either in format "type key" if the key to type map has been provided, or just the hex hash of the key if not.
 *
 * @example
 * // "key to type map provided"
 * {
 *   "string status": {
 *     key: "status",
 *     type: "string",
 *     value: "0x0000000000000000000000000000000000000000000000000000000000000000",
 *   },
 * }
 *
 * @example
 * // "key to type map not provided"
 * {
 *   "0x0000000000000000000000000000000000000000000000000000000000000000": {
 *     key: "0x0000000000000000000000000000000000000000000000000000000000000000",
 *     type: "bytes",
 *     value: "0x0000000000000000000000000000000000000000000000000000000000000000",
 *   },
 * }
 */
export type MetadataRecord = Record<
  string | Hex,
  {
    key: string;
    type: MetadataType;
    value: Hex;
  }
>;

export type MetadataKeyDefinition = {
  /**
   * The original key e.g. "status", "author", etc.
   */
  key: string;
  /**
   * The type of the key e.g. "string", "uint256", etc.
   */
  type: MetadataType;
};

/**
 * Mapping of known hex-encoded keys to their original key and type
 */
export type MetadataKeyTypeMap = Record<Hex, MetadataKeyDefinition>;

/**
 * Creates a metadata key by encoding a string in the format "type key".
 *
 * @param keyString - The key string (e.g., "status", "author", "url")
 * @param valueType - The type of the value MetadataType
 * @returns The hex-encoded bytes of the "type key" string of length 32 bytes padded from the left with leading zeros.
 *
 * @throws If the value type + key string exceeds 32 bytes
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

  // Convert to hex and pad from left to exactly 32 bytes
  const hexString = stringToHex(keyTypeString);
  return pad(hexString, { size: 32 });
}

/**
 * Decodes a metadata key from a hex-encoded key
 *
 * @param key - The hex-encoded key
 * @returns The decoded metadata key
 *
 * @throws If the metadata type is unknown
 * @throws If the key is not a valid hex string
 *
 * @example
 * const decodedKey = decodeMetadataKey("0x0000000000000000000000000000000000000000737472696e67207469746c65");
 * console.log(decodedKey);
 * // { key: "title", type: "string" }
 */
export function decodeMetadataKey(key: Hex): MetadataKeyDefinition {
  const stringKey = hexToString(key, { size: 32 });
  const trimmedStringKey = stringKey.replace(/\0/g, "").trim();
  const spaceIndex = trimmedStringKey.indexOf(" ");

  if (spaceIndex === -1) {
    throw new Error(
      `Malformed metadata key "${stringKey}" space delimiter is missing`,
    );
  }

  const type = trimmedStringKey.substring(0, spaceIndex);
  const originalKey = trimmedStringKey.substring(spaceIndex + 1);

  if (Object.values(MetadataTypeValues).includes(type as MetadataType)) {
    return {
      key: originalKey,
      type: type as MetadataType,
    };
  }

  throw new Error(`Unknown metadata type: ${type}`);
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
 * Decodes a string value from encoded metadata bytes.
 *
 * If the string is valid JSON value, it returns the parsed JSON value. Otherwise it returns string.
 *
 * @param encodedValue - The hex-encoded bytes
 * @returns The decoded string value. If the value can't be decoded, it will return an empty string.
 */
export function decodeStringValue(encodedValue: Hex): string | Json {
  // For strings, we need to handle both regular strings and JSON objects
  try {
    const decoded = hexToString(encodedValue);

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
 * Encodes a boolean value as bytes for metadata
 *
 * @param value - The boolean value to encode
 * @returns The hex-encoded bytes (32 bytes, 1 for true, 0 for false)
 */
export function encodeBoolValue(value: boolean): Hex {
  return toHex(value ? 1 : 0, { size: 32 });
}

/**
 * Decodes a boolean value from encoded metadata bytes
 *
 * @param encodedValue - The hex-encoded bytes (32 bytes, 1 for true, 0 for false)
 * @returns The decoded boolean value. If the value can't be decoded, it will return false.
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
 * Decodes a number value from encoded metadata bytes
 *
 * @param encodedValue - The hex-encoded bytes (32 bytes big-endian)
 * @param isSigned - Whether the number is signed (for two's complement handling)
 * @returns The decoded number value (as bigint for safety). If the value can't be decoded, it will return 0n.
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
 * Encodes a JSON object as bytes for metadata
 *
 * @param value - The JSON object to encode
 * @returns The hex-encoded bytes of the JSON string
 */
export function encodeJsonValue(value: JsonObject): Hex {
  if (typeof value !== "object" || value === null) {
    throw new Error(`Invalid JSON value: expected object, got ${typeof value}`);
  }

  return stringToHex(JSON.stringify(value));
}

/**
 * Decodes a JSON object from encoded metadata bytes
 *
 * @param value - The hex-encoded bytes of the JSON string
 * @returns The decoded JSON object
 *
 * @throws If the value is not a valid JSON object
 *
 * @example
 * const decodedValue = decodeJsonValue("0x0000000000000000000000000000000000000000000000000000000000000000");
 * console.log(decodedValue);
 * // { test: true }
 */
export function decodeJsonValue(value: Hex): JsonObject {
  const stringValue = hexToString(value);
  const parsedValue = JSON.parse(stringValue);

  if (
    parsedValue != null &&
    typeof parsedValue === "object" &&
    !Array.isArray(parsedValue)
  ) {
    return parsedValue;
  }

  throw new Error(
    `Invalid JSON value: expected object, got ${typeof parsedValue}`,
  );
}

/**
 * Creates a metadata entry from a key-value pair with explicit type specification
 *
 * @param keyString - The key string e.g. "status", "author", etc.
 * @param valueType - The metadata type (string, bool, uint256, etc.)
 * @param value - The value (string, boolean, number, bigint, or JsonObject). Will be encoded to the appropriate type.
 * @returns The MetadataEntry
 */
export function createMetadataEntry(
  keyString: string,
  valueType: MetadataType,
  value: string | boolean | number | bigint | JsonObject | Hex | Uint8Array,
): MetadataEntry {
  switch (valueType) {
    case "address": {
      if (typeof value !== "string") {
        throw new Error(
          `Value must be string for address type, got ${typeof value}`,
        );
      }

      if (!isAddress(value)) {
        throw new Error(
          `Value must be a valid address for address type, got ${value}`,
        );
      }

      return {
        key: createMetadataKey(keyString, valueType),
        value: encodeAddressValue(value),
      };
    }
    case "bool": {
      if (typeof value !== "boolean") {
        throw new Error(
          `Value must be boolean for bool type, got ${typeof value}`,
        );
      }

      return {
        key: createMetadataKey(keyString, valueType),
        value: encodeBoolValue(value),
      };
    }
    case "bytes": {
      if (!isHex(value)) {
        throw new Error(
          `Value must be hex for ${valueType} type, got ${typeof value}`,
        );
      }

      return {
        key: createMetadataKey(keyString, valueType),
        value,
      };
    }
    case "bytes32": {
      if (!isHex(value)) {
        throw new Error(
          `Value must be hex for ${valueType} type, got ${typeof value}`,
        );
      }

      if (size(value) > 32) {
        throw new Error(
          `Value must be 32 bytes for ${valueType} type, got ${size(value)}`,
        );
      }

      return {
        key: createMetadataKey(keyString, valueType),
        value,
      };
    }
    case "int128":
    case "int256":
    case "uint8":
    case "uint16":
    case "uint32":
    case "uint64":
    case "uint128":
    case "uint256": {
      if (typeof value !== "number" && typeof value !== "bigint") {
        throw new Error(
          `Value must be number or bigint for ${valueType} type, got ${typeof value}`,
        );
      }

      return {
        key: createMetadataKey(keyString, valueType),
        value: encodeNumberValue(value),
      };
    }
    case "string": {
      if (typeof value === "string") {
        return {
          key: createMetadataKey(keyString, valueType),
          value: encodeStringValue(value),
        };
      }

      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        !(value instanceof Uint8Array)
      ) {
        return {
          key: createMetadataKey(keyString, valueType),
          value: encodeJsonValue(value),
        };
      }

      throw new Error(
        `Value must be string or object for string type, got ${typeof value}`,
      );
    }
    default: {
      valueType satisfies never;
      throw new Error(`Unsupported metadata type: ${valueType}`);
    }
  }
}

/**
 * Creates multiple metadata entries from an object with explicit types
 *
 * @param metadata - An object with key-value pairs and their types
 * @returns Array of MetadataEntry
 *
 * @example
 * const metadata = {
 *   "status": {
 *     type: "string",
 *     value: "status",
 *   },
 * };
 * const metadataEntries = createMetadataEntries(metadata);
 * console.log(metadataEntries);
 * // [
 * //   {
 * //     key: "0x0000000000000000000000000000000000000000000000000000000000000000",
 * //     value: "0x0000000000000000000000000000000000000000000000000000000000000000",
 * //   },
 * // ]
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
 * @param keyString - The key string e.g. "status", "author", etc.
 * @param valueType - The type string MetadataType e.g. "string", "uint256", etc.
 * @param encodedValue - The pre-hex-encoded value as hex. For example by using encodeStringValue, encodeBoolValue, encodeNumberValue, encodeJsonValue, etc.
 * @returns The MetadataEntry
 *
 * @example
 * const metadataEntry = createCustomMetadataEntry("status", "string", encodeStringValue("status"));
 * console.log(metadataEntry);
 * // {
 * //   key: "0x0000000000000000000000000000000000000000000000000000000000000000",
 * //   value: "0x0000000000000000000000000000000000000000000000000000000000000000",
 * // }
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
 * @param keyTypeMap - Optional mapping of known keys to their original string and type. If not provided, the key in the record will be the hex hash of the key and the type will be "bytes".
 * @returns The metadata in Record format
 *
 * @example
 * // if key to type map provided is provided
 * const result = convertContractToRecordFormat(metadataEntries, createKeyTypeMap([{ key: "status", type: "string" }]));
 * console.log(result);
 * // {
 * //   "strin status": {
 * //     key: "status",
 * //     type: "string",
 * //     value: "0x0000000000000000000000000000000000000000000000000000000000000000",
 * //   },
 * }
 *
 * @example
 * // if key to type map not provided returns object like this
 * const result = convertContractToRecordFormat(metadataEntries);
 * console.log(result);
 * // {
 * //   "0x0000000000000000000000000000000000000000000000000000000000000000": {
 * //     key: "0x0000000000000000000000000000000000000000000000000000000000000000",
 * //     type: "bytes",
 * //     value: "0x0000000000000000000000000000000000000000000000000000000000000000",
 * //   },
 * }
 */
export function convertContractToRecordFormat(
  metadataEntries: MetadataEntry[],
  keyTypeMap?: MetadataKeyTypeMap,
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
 * @returns Mapping from hex-encoded key to original key and type
 */
export function createKeyTypeMap(
  knownKeys: Array<{
    /** The original key e.g. "status", "author", etc. */
    key: string;
    /** The type of the key e.g. "string", "uint256", etc. */
    type: MetadataType;
  }>,
): MetadataKeyTypeMap {
  const map: MetadataKeyTypeMap = {};

  for (const keyType of knownKeys) {
    const metadataKey = createMetadataKey(keyType.key, keyType.type);
    map[metadataKey] = keyType;
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
 * @param keyTypeMap - Optional mapping of known keys. If not provided, the key in the record will be the hex hash of the key.
 * @returns Metadata in Record format
 */
export function parseMetadataFromContract(
  metadata: MetadataEntry[],
  keyTypeMap?: MetadataKeyTypeMap,
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
): MetadataKeyTypeMap {
  const map: MetadataKeyTypeMap = {};

  for (const entry of metadataEntries) {
    try {
      const decodedKey = decodeMetadataKey(entry.key);

      map[entry.key] = decodedKey;
    } catch (error) {
      // If we can't parse the key, skip it
      console.warn(`Could not parse metadata key ${entry.key}:`, error);
    }
  }

  return map;
}

/**
 * Encodes an address value as bytes for metadata
 *
 * @param value - The address value to use
 * @returns The address as is if valid
 *
 * @throws If the value is not a valid address in hex format
 */
export function encodeAddressValue(value: Hex): Hex {
  if (!isAddress(value)) {
    throw new Error(
      `Value must be a valid address for address type, got ${value}`,
    );
  }

  return value;
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
 * Encodes a bytes value as bytes for metadata
 *
 * @param value - The bytes value to use
 * @returns The bytes as is if valid
 *
 * @throws If the value is not a valid hex string
 */
export function encodeBytesValue(value: Hex | Uint8Array): Hex {
  if (isHex(value)) {
    return value;
  }

  return toHex(value);
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
      (type) satisfies never;
      return entry.value; // Return raw hex for unknown types
  }
}
