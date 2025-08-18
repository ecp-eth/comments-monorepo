// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "../types/Comments.sol";
import { IHook } from "./IHook.sol";

interface IFeeEstimatableHook is IERC165, IHook {
  /// @notice Execute after a comment is processed
  /// @param commentData The comment data that was processed
  /// @param metadata The metadata entries for the comment
  /// @param msgSender The original msg.sender that initiated the transaction
  /// @param commentId The unique identifier of the processed comment
  /// @return commentAddFee The fee required for the adding the specific comment
  function getAddCommentFee(
    Comments.Comment calldata commentData,
    Metadata.MetadataEntry[] calldata metadata,
    address msgSender,
    bytes32 commentId
  ) external view returns (uint256 commentAddFee);

  /// @notice Execute after a comment is edited
  /// @param commentData The comment data that was edited
  /// @param metadata The metadata entries for the comment
  /// @param msgSender The original msg.sender that initiated the transaction
  /// @param commentId The unique identifier of the edited comment
  /// @return commentAddFee The fee required for the editing the specific comment
  function getEditCommentFee(
    Comments.Comment calldata commentData,
    Metadata.MetadataEntry[] calldata metadata,
    address msgSender,
    bytes32 commentId
  ) external view returns (uint256 commentAddFee);
}
