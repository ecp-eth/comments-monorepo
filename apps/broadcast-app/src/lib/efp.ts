import { AssetId } from "caip";
import { type Hex, concatHex, numberToHex, stringToHex } from "viem";

export function encodeERC721Record(caip: AssetId): Hex {
  const version: Hex = "0x80";
  const type: Hex = "0x80";
  const data = stringToHex(caip.toString());

  return concatHex([version, type, data]);
}

export function encodeListAddOp(record: Hex): Hex {
  const opVersion = numberToHex(1, { size: 1 });
  const op = numberToHex(1, { size: 1 });

  return concatHex([opVersion, op, record]);
}

export function encodeListRemoveOp(record: Hex): Hex {
  const opVersion = numberToHex(1, { size: 1 });
  const op = numberToHex(2, { size: 1 });

  return concatHex([opVersion, op, record]);
}
