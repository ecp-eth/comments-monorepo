import { describe, it, expect } from "vitest";
import { type Hex, pad, stringToHex } from "viem";
import {
  createMetadataEntry,
  createMetadataEntries,
  encodeNumberValue,
  convertContractToRecordFormat,
  decodeMetadataTypes,
  decodeMetadataValue,
  MetadataTypeValues,
  createMetadataKey,
  encodeStringValue,
  decodeMetadataKey,
  decodeStringValue,
  decodeBoolValue,
  encodeBoolValue,
  encodeJsonValue,
  decodeJsonValue,
  decodeNumberValue,
  MetadataType,
  convertRecordToContractFormat,
  createKeyTypeMap,
} from "../metadata.js";
import type { JsonObject } from "../types.js";

describe("createMetadataKey", () => {
  it("should create left padded metadata key", () => {
    const key = createMetadataKey("title", MetadataTypeValues.STRING);
    expect(key).toBe(
      "0x0000000000000000000000000000000000000000737472696e67207469746c65",
    );
  });

  it("should throw an error if the key is too long", () => {
    expect(() =>
      createMetadataKey("a".repeat(26), MetadataTypeValues.STRING),
    ).toThrow(
      `Metadata key "string ${"a".repeat(26)}" exceeds maximum length of 32 bytes`,
    );
  });
});

describe("decodeMetadataKey", () => {
  it("should decode a metadata key", () => {
    const decodedKey = decodeMetadataKey(
      "0x0000000000000000000000000000000000000000737472696e67207469746c65",
    );
    expect(decodedKey).toStrictEqual({
      key: "title",
      type: MetadataTypeValues.STRING,
    });
  });

  it("should strip zero bytes from the key", () => {
    const decodedKey = decodeMetadataKey(
      stringToHex("\0\0string\0 \0title\0\0\0", { size: 32 }),
    );
    expect(decodedKey).toStrictEqual({
      key: "title",
      type: MetadataTypeValues.STRING,
    });
  });

  it("does not matter if the hex is padded from the left or right", () => {
    const key = stringToHex("string title");
    const lefPaddedKey = pad(key, { size: 32 });
    const rightPaddedKey = pad(key, { size: 32, dir: "right" });

    const decodedLeftKey = decodeMetadataKey(lefPaddedKey);
    const decodedRightKey = decodeMetadataKey(rightPaddedKey);

    expect(decodedLeftKey).toStrictEqual(decodedRightKey);
  });

  it("throws if the key is not a valid hex string", () => {
    expect(() =>
      decodeMetadataKey(stringToHex("stringtitle", { size: 32 })),
    ).toThrow(
      'Malformed metadata key "stringtitle" space delimiter is missing',
    );
  });

  it("throws if the key is not a valid metadata type", () => {
    expect(() =>
      decodeMetadataKey(stringToHex("faketype title", { size: 32 })),
    ).toThrow("Unknown metadata type: faketype");
  });
});

describe("createMetadataEntry", () => {
  it("should create a metadata entry", () => {
    const metadataEntry = createMetadataEntry(
      "title",
      MetadataTypeValues.STRING,
      "title",
    );
    expect(metadataEntry).toStrictEqual({
      key: "0x0000000000000000000000000000000000000000737472696e67207469746c65",
      value: "0x7469746c65",
    });
  });
});

describe("createMetadataEntries", () => {
  const originalMetadata = {
    title: {
      type: MetadataTypeValues.STRING,
      value: "title",
    },
    description: {
      type: MetadataTypeValues.STRING,
      value: "description",
    },
    category: {
      type: MetadataTypeValues.STRING,
      value: "category",
    },
  };

  it("should create metadata entries", () => {
    const metadataEntries = createMetadataEntries(originalMetadata);
    expect(metadataEntries).toStrictEqual([
      {
        key: "0x0000000000000000000000000000000000000000737472696e67207469746c65",
        value: "0x7469746c65",
      },
      {
        key: "0x0000000000000000000000000000737472696e67206465736372697074696f6e",
        value: "0x6465736372697074696f6e",
      },
      {
        key: "0x0000000000000000000000000000000000737472696e672063617465676f7279",
        value: "0x63617465676f7279",
      },
    ]);
  });
});

describe("encodeStringValue", () => {
  it("should encode a string value", () => {
    const value = encodeStringValue("Test Title");
    expect(value).toBe("0x54657374205469746c65");
  });
});

describe("decodeMetadataTypes", () => {
  const originalMetadata = {
    title: {
      type: MetadataTypeValues.STRING,
      value: "title",
    },
    description: {
      type: MetadataTypeValues.STRING,
      value: "description",
    },
    category: {
      type: MetadataTypeValues.STRING,
      value: "category",
    },
  };

  it("should decode metadata types", () => {
    const metadataEntries = createMetadataEntries(originalMetadata);
    const decodedMetadataTypes = decodeMetadataTypes(metadataEntries);

    expect(decodedMetadataTypes).toStrictEqual({
      [createMetadataKey("title", MetadataTypeValues.STRING)]: {
        key: "title",
        type: MetadataTypeValues.STRING,
      },
      [createMetadataKey("description", MetadataTypeValues.STRING)]: {
        key: "description",
        type: MetadataTypeValues.STRING,
      },
      [createMetadataKey("category", MetadataTypeValues.STRING)]: {
        key: "category",
        type: MetadataTypeValues.STRING,
      },
    });
  });

  it("should work with convertContractToRecordFormat", () => {
    const metadataEntries = createMetadataEntries(originalMetadata);
    const decodedMetadataTypes = decodeMetadataTypes(metadataEntries);
    const convertedMetadata = convertContractToRecordFormat(
      metadataEntries,
      decodedMetadataTypes,
    );

    expect(convertedMetadata).toStrictEqual({
      "string title": {
        key: "title",
        type: MetadataTypeValues.STRING,
        value: "0x7469746c65",
      },
      "string description": {
        key: "description",
        type: MetadataTypeValues.STRING,
        value: "0x6465736372697074696f6e",
      },
      "string category": {
        key: "category",
        type: MetadataTypeValues.STRING,
        value: "0x63617465676f7279",
      },
    });
  });
});

describe("decodeMetadataTypes", () => {
  const originalMetadata = {
    title: {
      type: MetadataTypeValues.STRING,
      value: "title",
    },
    "0\0": {
      // uses zero byte at the end
      type: MetadataTypeValues.STRING,
      value: "0",
    },
  };

  it("should decode metadata types", () => {
    const metadataEntries = createMetadataEntries(originalMetadata);
    const decodedMetadataTypes = decodeMetadataTypes(metadataEntries);
    expect(decodedMetadataTypes).toStrictEqual({
      "0x0000000000000000000000000000000000000000737472696e67207469746c65": {
        key: "title",
        type: MetadataTypeValues.STRING,
      },
      "0x0000000000000000000000000000000000000000000000737472696e67203000": {
        key: "0",
        type: MetadataTypeValues.STRING,
      },
    });
  });
});

describe("decodeStringValue", () => {
  it.each([
    [stringToHex(""), ""],
    [stringToHex(" "), " "],
    [stringToHex("\0"), "\0"],
    [stringToHex("string"), "string"],
    [stringToHex("😄 🤫 😌"), "😄 🤫 😌"],
    [stringToHex("string\0 \0title\0\0\0"), "string\0 \0title\0\0\0"],
    [stringToHex(JSON.stringify({ test: true })), { test: true }],
    [stringToHex("123"), 123],
    [stringToHex("123.456"), 123.456],
    [stringToHex("true"), true],
    [stringToHex("false"), false],
    [stringToHex("null"), null],
    [stringToHex("{a:1}"), "{a:1}"],
    ["0xggee", ""],
    ["0x", ""],
    ["0x00", "\0"],
    ["0xf09f", "�"], // invalid UTF-8 sequence
  ])("should decode a string value %s to %o", (encodedValue, expectedValue) => {
    const decodedValue = decodeStringValue(encodedValue as Hex);

    expect(decodedValue).toStrictEqual(expectedValue);
  });
});

describe("encodeBoolValue", () => {
  it.each([
    [
      true,
      "0x0000000000000000000000000000000000000000000000000000000000000001",
    ],
    [
      false,
      "0x0000000000000000000000000000000000000000000000000000000000000000",
    ],
  ])("should encode a bool value %o to %s", (value, expectedValue) => {
    const encodedValue = encodeBoolValue(value);

    expect(encodedValue).toStrictEqual(expectedValue);
  });
});

describe("decodeBoolValue", () => {
  it.each([
    [encodeBoolValue(false), false],
    ["0x", false],
    [
      "0x0100000000000000000000000000000000000000000000000000000000000000",
      false,
    ],
    [encodeBoolValue(true), true],
    ["0x01", true],
  ])("should decode a bool value %s to %o", (encodedValue, expectedValue) => {
    const decodedValue = decodeBoolValue(encodedValue as Hex);

    expect(decodedValue).toStrictEqual(expectedValue);
  });
});

describe("encodeJsonValue", () => {
  it("should encode a json object value", () => {
    const encodedValue = encodeJsonValue({ test: true });
    expect(encodedValue).toStrictEqual("0x7b2274657374223a747275657d");
  });

  it("should throw an error if the value is not a json object", () => {
    expect(() => encodeJsonValue("test" as unknown as JsonObject)).toThrow(
      "Invalid JSON value: expected object, got string",
    );
  });
});

describe("decodeJsonValue", () => {
  it("should decode a json object value", () => {
    const decodedValue = decodeJsonValue(encodeJsonValue({ test: true }));
    expect(decodedValue).toStrictEqual({ test: true });
  });

  it("should throw an error if the value is not a json object", () => {
    expect(() => decodeJsonValue(stringToHex('"test"'))).toThrow(
      "Invalid JSON value: expected object, got string",
    );
  });
});

describe("encodeNumberValue", () => {
  it.each([
    [0n, "0x0000000000000000000000000000000000000000000000000000000000000000"],
    [0, "0x0000000000000000000000000000000000000000000000000000000000000000"],
    [1n, "0x0000000000000000000000000000000000000000000000000000000000000001"],
    [1, "0x0000000000000000000000000000000000000000000000000000000000000001"],
    [
      255n,
      "0x00000000000000000000000000000000000000000000000000000000000000ff",
    ],
    [255, "0x00000000000000000000000000000000000000000000000000000000000000ff"],
    [
      65535n,
      "0x000000000000000000000000000000000000000000000000000000000000ffff",
    ],
    [
      65535,
      "0x000000000000000000000000000000000000000000000000000000000000ffff",
    ],
    [
      4294967295n,
      "0x00000000000000000000000000000000000000000000000000000000ffffffff",
    ],
    [
      4294967295,
      "0x00000000000000000000000000000000000000000000000000000000ffffffff",
    ],
    [
      18446744073709551615n,
      "0x000000000000000000000000000000000000000000000000ffffffffffffffff",
    ],
    [-1n, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"],
    [-1, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"],
    [
      -255n,
      "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff01",
    ],
    [
      -255,
      "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff01",
    ],
    [
      -65535n,
      "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0001",
    ],
    [
      -65535,
      "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0001",
    ],
    [
      -4294967295n,
      "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000001",
    ],
    [
      -4294967295,
      "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000001",
    ],
    [
      -18446744073709551615n,
      "0xffffffffffffffffffffffffffffffffffffffffffffffff0000000000000001",
    ],
  ])("should encode a number value %o to %s", (value, expectedValue) => {
    const encodedValue = encodeNumberValue(value);
    expect(encodedValue).toStrictEqual(expectedValue);
  });

  it("should throw an error if the value is not an integer", () => {
    expect(() => encodeNumberValue(1.5)).toThrow("Value must be integer");
  });
});

describe("decodeNumberValue", () => {
  it.each([
    [encodeNumberValue(0), 0n, false],
    [encodeNumberValue(0), 0n, false],
    [encodeNumberValue(1), 1n, false],
    [encodeNumberValue(255), 255n, false],
    [encodeNumberValue(65535), 65535n, false],
    [encodeNumberValue(4294967295), 4294967295n, false],
    [encodeNumberValue(18446744073709551615n), 18446744073709551615n, false],
    [encodeNumberValue(-1), -1n, true],
    [encodeNumberValue(-255), -255n, true],
    [encodeNumberValue(-65535), -65535n, true],
    [encodeNumberValue(-4294967295), -4294967295n, true],
    [encodeNumberValue(-18446744073709551615n), -18446744073709551615n, true],
  ])(
    "should decode a number value %s to %o",
    (encodedValue, expectedValue, isSigned) => {
      const decodedValue = decodeNumberValue(encodedValue, isSigned);

      expect(decodedValue).toStrictEqual(expectedValue);
    },
  );
});

describe("decodeMetadataValue", () => {
  it.each([
    [
      MetadataTypeValues.STRING,
      createMetadataEntry("title", MetadataTypeValues.STRING, "title"),
      "title",
    ],
    [
      MetadataTypeValues.BOOL,
      createMetadataEntry("title", MetadataTypeValues.BOOL, true),
      true,
    ],
    [
      MetadataTypeValues.UINT8,
      createMetadataEntry("title", MetadataTypeValues.UINT256, 1),
      1n,
    ],
    [
      MetadataTypeValues.UINT16,
      createMetadataEntry("title", MetadataTypeValues.UINT16, 1),
      1n,
    ],
    [
      MetadataTypeValues.UINT32,
      createMetadataEntry("title", MetadataTypeValues.UINT32, 1),
      1n,
    ],
    [
      MetadataTypeValues.UINT64,
      createMetadataEntry("title", MetadataTypeValues.UINT64, 1),
      1n,
    ],
    [
      MetadataTypeValues.UINT128,
      createMetadataEntry("title", MetadataTypeValues.UINT128, 1),
      1n,
    ],
    [
      MetadataTypeValues.UINT256,
      createMetadataEntry("title", MetadataTypeValues.UINT256, 1),
      1n,
    ],
    [
      MetadataTypeValues.INT128,
      createMetadataEntry("title", MetadataTypeValues.INT128, 1),
      1n,
    ],
    [
      MetadataTypeValues.INT256,
      createMetadataEntry("title", MetadataTypeValues.INT256, 1),
      1n,
    ],
    [
      MetadataTypeValues.ADDRESS,
      createMetadataEntry(
        "title",
        MetadataTypeValues.ADDRESS,
        "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      ),
      "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    ],
    [
      MetadataTypeValues.BYTES32,
      createMetadataEntry("title", MetadataTypeValues.BYTES32, "0x1234"),
      "0x1234",
    ],
    [
      MetadataTypeValues.BYTES,
      createMetadataEntry("title", MetadataTypeValues.BYTES, "0x1234"),
      "0x1234",
    ],
  ])("should decode %s type value", (type, metadataEntry, expectedValue) => {
    const decodedValue = decodeMetadataValue(metadataEntry, type);

    expect(decodedValue).toStrictEqual(expectedValue);
  });

  it("should throw on unknown type", () => {
    expect(() =>
      decodeMetadataValue(
        createMetadataEntry(
          "title",
          "unknown" as unknown as MetadataType,
          "title",
        ),
        "unknown" as unknown as MetadataType,
      ),
    ).toThrow("Unsupported metadata type: unknown");
  });
});

describe("convertRecordToContractFormat", () => {
  it("should convert a record to a contract format", () => {
    const contractFormat = convertRecordToContractFormat({
      title: {
        key: "title",
        type: MetadataTypeValues.STRING,
        value: encodeStringValue("title"),
      },
    });

    expect(contractFormat).toStrictEqual([
      {
        key: createMetadataKey("title", MetadataTypeValues.STRING),
        value: encodeStringValue("title"),
      },
    ]);
  });
});

describe("convertContractToRecordFormat", () => {
  it("should convert a contract format to a record format without a key type map", () => {
    const recordFormat = convertContractToRecordFormat([
      {
        key: createMetadataKey("title", MetadataTypeValues.STRING),
        value: encodeStringValue("title"),
      },
    ]);

    expect(recordFormat).toStrictEqual({
      "0x0000000000000000000000000000000000000000737472696e67207469746c65": {
        key: "0x0000000000000000000000000000000000000000737472696e67207469746c65",
        type: MetadataTypeValues.BYTES,
        value: encodeStringValue("title"),
      },
    });
  });

  it("should convert a contract format to a record format with a key type map", () => {
    const recordFormat = convertContractToRecordFormat(
      [
        {
          key: createMetadataKey("title", MetadataTypeValues.STRING),
          value: encodeStringValue("title"),
        },
      ],
      createKeyTypeMap([
        {
          key: "title",
          type: MetadataTypeValues.STRING,
        },
      ]),
    );

    expect(recordFormat).toStrictEqual({
      "string title": {
        key: "title",
        type: MetadataTypeValues.STRING,
        value: encodeStringValue("title"),
      },
    });
  });
});
