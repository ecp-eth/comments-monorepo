// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "solady/utils/SignatureCheckerLib.sol";
import "./Comments.sol";
import "./Metadata.sol";

/// @title CommentSigning - Library for comment signing operations
/// @notice Handles EIP-712 signing, hash generation, and signature verification for comments
library CommentSigning {
  // EIP-712 Type Hashes
  bytes32 public constant ADD_COMMENT_TYPEHASH =
    keccak256(
      "AddComment(string content,MetadataEntry[] metadata,string targetUri,uint8 commentType,address author,address app,uint256 channelId,uint256 deadline,bytes32 parentId)MetadataEntry(bytes32 key,bytes value)"
    );
  bytes32 public constant DELETE_COMMENT_TYPEHASH =
    keccak256(
      "DeleteComment(bytes32 commentId,address author,address app,uint256 deadline)"
    );
  bytes32 public constant EDIT_COMMENT_TYPEHASH =
    keccak256(
      "EditComment(bytes32 commentId,string content,MetadataEntry[] metadata,address author,address app,uint256 nonce,uint256 deadline)MetadataEntry(bytes32 key,bytes value)"
    );
  bytes32 public constant ADD_APPROVAL_TYPEHASH =
    keccak256(
      "AddApproval(address author,address app,uint256 expiry,uint256 nonce,uint256 deadline)"
    );
  bytes32 public constant REMOVE_APPROVAL_TYPEHASH =
    keccak256(
      "RemoveApproval(address author,address app,uint256 nonce,uint256 deadline)"
    );

  /// @notice Generate EIP-712 domain separator
  /// @param name The name of the signing domain
  /// @param version The version of the signing domain
  /// @param chainId The chain ID
  /// @param verifyingContract The address of the contract that will verify signatures
  /// @return The domain separator hash
  function generateDomainSeparator(
    string memory name,
    string memory version,
    uint256 chainId,
    address verifyingContract
  ) internal pure returns (bytes32) {
    return
      keccak256(
        abi.encode(
          keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
          ),
          keccak256(bytes(name)),
          keccak256(bytes(version)),
          chainId,
          verifyingContract
        )
      );
  }

  /// @notice Hash metadata array for EIP-712
  /// @param metadata The metadata array to hash
  /// @return The hash of the metadata array
  function hashMetadataArray(
    Metadata.MetadataEntry[] memory metadata
  ) internal pure returns (bytes32) {
    bytes32[] memory hashedEntries = new bytes32[](metadata.length);

    for (uint i = 0; i < metadata.length; i++) {
      hashedEntries[i] = keccak256(
        abi.encode(
          keccak256("MetadataEntry(bytes32 key,bytes value)"),
          metadata[i].key,
          keccak256(metadata[i].value)
        )
      );
    }

    return keccak256(abi.encodePacked(hashedEntries));
  }

  /// @notice Generate comment ID hash
  /// @param commentData The comment data to hash
  /// @param domainSeparator The EIP-712 domain separator
  /// @return The comment ID hash
  function getCommentId(
    Comments.CreateComment memory commentData,
    bytes32 domainSeparator
  ) internal pure returns (bytes32) {
    bytes32 structHash = keccak256(
      abi.encode(
        ADD_COMMENT_TYPEHASH,
        keccak256(bytes(commentData.content)),
        hashMetadataArray(commentData.metadata),
        keccak256(bytes(commentData.targetUri)),
        commentData.commentType,
        commentData.author,
        commentData.app,
        commentData.channelId,
        commentData.deadline,
        commentData.parentId
      )
    );

    return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
  }

  /// @notice Generate edit comment hash
  /// @param commentId The unique identifier of the comment to edit
  /// @param author The address of the comment author
  /// @param editData The comment data struct containing content and metadata
  /// @param domainSeparator The EIP-712 domain separator
  /// @return The edit comment hash
  function getEditCommentHash(
    bytes32 commentId,
    address author,
    Comments.EditComment memory editData,
    bytes32 domainSeparator
  ) internal pure returns (bytes32) {
    bytes32 structHash = keccak256(
      abi.encode(
        EDIT_COMMENT_TYPEHASH,
        commentId,
        keccak256(bytes(editData.content)),
        hashMetadataArray(editData.metadata),
        author,
        editData.app,
        editData.nonce,
        editData.deadline
      )
    );

    return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
  }

  /// @notice Generate delete comment hash
  /// @param commentId The unique identifier of the comment to delete
  /// @param author The address of the comment author
  /// @param app The app address
  /// @param deadline The signature deadline
  /// @param domainSeparator The EIP-712 domain separator
  /// @return The delete comment hash
  function getDeleteCommentHash(
    bytes32 commentId,
    address author,
    address app,
    uint256 deadline,
    bytes32 domainSeparator
  ) internal pure returns (bytes32) {
    bytes32 structHash = keccak256(
      abi.encode(DELETE_COMMENT_TYPEHASH, commentId, author, app, deadline)
    );

    return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
  }

  /// @notice Generate add approval hash
  /// @param author The address granting approval
  /// @param app The address being approved
  /// @param expiry The timestamp when the approval expires
  /// @param nonce The nonce for replay protection
  /// @param deadline The signature deadline
  /// @param domainSeparator The EIP-712 domain separator
  /// @return The add approval hash
  function getAddApprovalHash(
    address author,
    address app,
    uint256 expiry,
    uint256 nonce,
    uint256 deadline,
    bytes32 domainSeparator
  ) internal pure returns (bytes32) {
    bytes32 structHash = keccak256(
      abi.encode(ADD_APPROVAL_TYPEHASH, author, app, expiry, nonce, deadline)
    );

    return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
  }

  /// @notice Generate remove approval hash
  /// @param author The address removing approval
  /// @param app The address being unapproved
  /// @param nonce The nonce for replay protection
  /// @param deadline The signature deadline
  /// @param domainSeparator The EIP-712 domain separator
  /// @return The remove approval hash
  function getRemoveApprovalHash(
    address author,
    address app,
    uint256 nonce,
    uint256 deadline,
    bytes32 domainSeparator
  ) internal pure returns (bytes32) {
    bytes32 structHash = keccak256(
      abi.encode(REMOVE_APPROVAL_TYPEHASH, author, app, nonce, deadline)
    );

    return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
  }

  /// @notice Verify app signature for comment operations
  /// @param app The app address
  /// @param hash The hash to verify
  /// @param signature The signature to verify
  /// @param msgSender The message sender
  /// @return True if signature is valid or if msgSender is the app
  function verifyAppSignature(
    address app,
    bytes32 hash,
    bytes memory signature,
    address msgSender
  ) internal view returns (bool) {
    return
      msgSender == app ||
      SignatureCheckerLib.isValidSignatureNow(app, hash, signature);
  }

  /// @notice Verify author signature
  /// @param author The author address
  /// @param hash The hash to verify
  /// @param signature The signature to verify
  /// @return True if signature is valid
  function verifyAuthorSignature(
    address author,
    bytes32 hash,
    bytes memory signature
  ) internal view returns (bool) {
    return SignatureCheckerLib.isValidSignatureNow(author, hash, signature);
  }

  /// @notice Check if author is approved by app
  /// @param approvalExpiry The approval expiry timestamp
  /// @return True if approval is still valid
  function isApprovalValid(
    address /* author */,
    address /* app */,
    uint256 approvalExpiry
  ) internal view returns (bool) {
    return approvalExpiry > block.timestamp;
  }
}
