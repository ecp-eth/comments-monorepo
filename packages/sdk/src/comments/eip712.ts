export const DOMAIN_NAME = "Comments";
export const DOMAIN_VERSION = "1";

export const ADD_COMMENT_TYPE = {
  AddComment: [
    { name: "content", type: "string" },
    { name: "metadata", type: "string" },
    { name: "targetUri", type: "string" },
    { name: "commentType", type: "string" },
    { name: "author", type: "address" },
    { name: "app", type: "address" },
    { name: "channelId", type: "uint256" },
    { name: "deadline", type: "uint256" },
    { name: "parentId", type: "bytes32" },
  ],
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
    { name: "metadata", type: "string" },
    { name: "author", type: "address" },
    { name: "app", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export const ADD_APPROVAL_TYPE = {
  AddApproval: [
    { name: "author", type: "address" },
    { name: "app", type: "address" },
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
