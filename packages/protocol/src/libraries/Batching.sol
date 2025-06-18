// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Comments.sol";
import "./Metadata.sol";
import "../interfaces/ICommentManager.sol";

/// @title Batching - Library for handling batch comment operations
library Batching {
  /// @notice Event emitted when a batch operation is executed
  event BatchOperationExecuted(
    address indexed sender,
    uint256 operationsCount,
    uint256 totalValue
  );

  /// @notice Validate batch operations structure and value distribution
  /// @param operations Array of batch operations to validate
  /// @param msgValue The total value sent with the transaction
  /// @return totalRequiredValue The total value required for all operations
  function validateBatchOperations(
    Comments.BatchOperation[] calldata operations,
    uint256 msgValue
  ) external pure returns (uint256 totalRequiredValue) {
    if (operations.length == 0) {
      revert ICommentManager.InvalidBatchOperation(0, "Empty operations array");
    }

    // Validate total value distribution
    totalRequiredValue = 0;
    for (uint i = 0; i < operations.length; i++) {
      totalRequiredValue += operations[i].value;
    }

    if (msgValue != totalRequiredValue) {
      revert ICommentManager.InvalidValueDistribution(
        msgValue,
        totalRequiredValue
      );
    }

    return totalRequiredValue;
  }

  /// @notice Validate a single batch operation's signature requirements
  /// @param operation The batch operation to validate
  /// @param operationIndex The index of the operation for error reporting
  function validateBatchOperationSignatures(
    Comments.BatchOperation calldata operation,
    uint256 operationIndex
  ) external pure {
    if (operation.operationType == Comments.BatchOperationType.POST_COMMENT) {
      if (operation.signatures.length != 1) {
        revert ICommentManager.InvalidBatchOperation(
          operationIndex,
          "POST_COMMENT requires exactly 1 signature"
        );
      }
    } else if (
      operation.operationType ==
      Comments.BatchOperationType.POST_COMMENT_WITH_SIG
    ) {
      if (operation.signatures.length != 2) {
        revert ICommentManager.InvalidBatchOperation(
          operationIndex,
          "POST_COMMENT_WITH_SIG requires exactly 2 signatures"
        );
      }
    } else if (
      operation.operationType == Comments.BatchOperationType.EDIT_COMMENT
    ) {
      if (operation.signatures.length != 1) {
        revert ICommentManager.InvalidBatchOperation(
          operationIndex,
          "EDIT_COMMENT requires exactly 1 signature"
        );
      }
    } else if (
      operation.operationType ==
      Comments.BatchOperationType.EDIT_COMMENT_WITH_SIG
    ) {
      if (operation.signatures.length != 2) {
        revert ICommentManager.InvalidBatchOperation(
          operationIndex,
          "EDIT_COMMENT_WITH_SIG requires exactly 2 signatures"
        );
      }
    } else if (
      operation.operationType == Comments.BatchOperationType.DELETE_COMMENT
    ) {
      if (operation.signatures.length != 0) {
        revert ICommentManager.InvalidBatchOperation(
          operationIndex,
          "DELETE_COMMENT requires no signatures"
        );
      }
    } else if (
      operation.operationType ==
      Comments.BatchOperationType.DELETE_COMMENT_WITH_SIG
    ) {
      if (operation.signatures.length != 2) {
        revert ICommentManager.InvalidBatchOperation(
          operationIndex,
          "DELETE_COMMENT_WITH_SIG requires exactly 2 signatures"
        );
      }
    } else {
      revert ICommentManager.InvalidBatchOperation(
        operationIndex,
        "Invalid operation type"
      );
    }
  }

  /// @notice Decode batch operation data for POST_COMMENT and POST_COMMENT_WITH_SIG
  /// @param operation The batch operation
  /// @return commentData The decoded comment data
  function decodePostCommentData(
    Comments.BatchOperation calldata operation
  ) external pure returns (Comments.CreateComment memory commentData) {
    commentData = abi.decode(operation.data, (Comments.CreateComment));
    return commentData;
  }

  /// @notice Decode batch operation data for EDIT_COMMENT and EDIT_COMMENT_WITH_SIG
  /// @param operation The batch operation
  /// @return commentId The comment ID to edit
  /// @return editData The decoded edit data
  function decodeEditCommentData(
    Comments.BatchOperation calldata operation
  )
    external
    pure
    returns (bytes32 commentId, Comments.EditComment memory editData)
  {
    (commentId, editData) = abi.decode(
      operation.data,
      (bytes32, Comments.EditComment)
    );
    return (commentId, editData);
  }

  /// @notice Decode batch operation data for DELETE_COMMENT
  /// @param operation The batch operation
  /// @return commentId The comment ID to delete
  function decodeDeleteCommentData(
    Comments.BatchOperation calldata operation
  ) external pure returns (bytes32 commentId) {
    commentId = abi.decode(operation.data, (bytes32));
    return commentId;
  }

  /// @notice Decode batch operation data for DELETE_COMMENT_WITH_SIG
  /// @param operation The batch operation
  /// @return deleteData The decoded delete data
  function decodeDeleteCommentWithSigData(
    Comments.BatchOperation calldata operation
  ) external pure returns (Comments.BatchDeleteData memory deleteData) {
    deleteData = abi.decode(operation.data, (Comments.BatchDeleteData));
    return deleteData;
  }

  /// @notice Encode a comment ID as result data
  /// @param commentId The comment ID to encode
  /// @return result The encoded result
  function encodeCommentIdResult(
    bytes32 commentId
  ) external pure returns (bytes memory result) {
    return abi.encode(commentId);
  }

  /// @notice Get empty result for operations that don't return data
  /// @return result Empty bytes
  function getEmptyResult() external pure returns (bytes memory result) {
    return "";
  }

  /// @notice Emit batch operation executed event
  /// @param sender The sender of the batch transaction
  /// @param operationsCount The number of operations executed
  /// @param totalValue The total value sent
  function emitBatchOperationExecuted(
    address sender,
    uint256 operationsCount,
    uint256 totalValue
  ) external {
    emit BatchOperationExecuted(sender, operationsCount, totalValue);
  }
}
