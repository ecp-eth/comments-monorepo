// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "../types/Comments.sol";
import { IHook } from "./IHook.sol";
import { FeeEstimatable } from "../types/FeeEstimatable.sol";

interface IFeeEstimatableHook is IERC165, IHook {
  /// @notice Should return the fee estimation for adding a comment
  /// @param commentData The comment data that will be processed
  /// @param metadata The metadata entries for the comment
  /// @param msgSender The msg.sender that will initiate the comment action
  /// @return feeEstimation The fee estimation
  function estimateAddCommentFee(
    Comments.Comment calldata commentData,
    Metadata.MetadataEntry[] calldata metadata,
    address msgSender
  ) external view returns (FeeEstimatable.FeeEstimation memory feeEstimation);

  /// @notice Should return the fee estimation for editing a comment
  /// @param commentData The comment data that will be processed
  /// @param metadata The metadata entries for the comment
  /// @param msgSender The msg.sender that will initiate the comment action
  /// @return feeEstimation The fee estimation
  function estimateEditCommentFee(
    Comments.Comment calldata commentData,
    Metadata.MetadataEntry[] calldata metadata,
    address msgSender
  ) external view returns (FeeEstimatable.FeeEstimation memory feeEstimation);
}
