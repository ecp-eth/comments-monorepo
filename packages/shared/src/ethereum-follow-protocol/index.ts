import { getAddress, hexToBigInt, hexToNumber, sliceHex, type Hex } from "viem";

export type DecodedListStorageLocation = {
  version: number;
  locationType: number;
  chainId: bigint;
  recordsAddress: Hex;
  slot: bigint;
};

/**
 * Decodes a list storage location
 * @param location The list storage location to decode
 * @returns The decoded list storage location
 */
export function decodeListStorageLocation(
  location: Hex,
): DecodedListStorageLocation {
  const version = hexToNumber(sliceHex(location, 0, 1), { size: 1 });
  const locationType = hexToNumber(sliceHex(location, 1, 2), { size: 1 });

  if (version !== 1 || locationType !== 1) {
    throw new Error("Invalid list location");
  }

  const chainId = hexToBigInt(sliceHex(location, 2, 34));
  const recordsAddress = getAddress(sliceHex(location, 34, 54));
  const slot = hexToBigInt(sliceHex(location, 54, 86));

  return {
    version,
    locationType,
    chainId,
    recordsAddress,
    slot,
  };
}
