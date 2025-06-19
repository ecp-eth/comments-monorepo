export const DOMAIN_NAME = "Ethereum Comments Protocol";
export const DOMAIN_VERSION = "1";

export const METADATA_ENTRY_TYPE = {
  MetadataEntry: [
    { name: "key", type: "bytes32" },
    { name: "value", type: "bytes" },
  ],
} as const;

export const ADD_COMMENT_TYPE = {
  AddComment: [
    { name: "content", type: "string" },
    { name: "metadata", type: "MetadataEntry[]" },
    { name: "targetUri", type: "string" },
    { name: "commentType", type: "uint8" },
    { name: "author", type: "address" },
    { name: "app", type: "address" },
    { name: "channelId", type: "uint256" },
    { name: "deadline", type: "uint256" },
    { name: "parentId", type: "bytes32" },
  ],
  ...METADATA_ENTRY_TYPE,
} as const;

export const DELETE_COMMENT_TYPE = {
  DeleteComment: [
    { name: "commentId", type: "bytes32" },
    { name: "author", type: "address" },
    { name: "app", type: "address" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export const EDIT_COMMENT_TYPE = {
  EditComment: [
    { name: "commentId", type: "bytes32" },
    { name: "content", type: "string" },
    { name: "metadata", type: "MetadataEntry[]" },
    { name: "author", type: "address" },
    { name: "app", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
  ...METADATA_ENTRY_TYPE,
} as const;

export const ADD_APPROVAL_TYPE = {
  AddApproval: [
    { name: "author", type: "address" },
    { name: "app", type: "address" },
    { name: "expiry", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export const REMOVE_APPROVAL_TYPE = {
  RemoveApproval: [
    { name: "author", type: "address" },
    { name: "app", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;
