// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IHook } from "../interfaces/IHook.sol";
import {
  IERC165
} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { ERC165 } from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import { Hooks } from "../types/Hooks.sol";
import { Comments } from "../types/Comments.sol";
import { Channels } from "../types/Channels.sol";
import { Metadata } from "../types/Metadata.sol";
import { IFeeEstimatableHook } from "../interfaces/IFeeEstimatableHook.sol";
import { FeeEstimatable } from "../types/FeeEstimatable.sol";

/**
 * @title FeeEstimatableHook
 * @notice Abstract base contract for all hook implementations
 * @dev Provides default implementations that throw EstimatorNotImplemented if not overridden
 */
abstract contract FeeEstimatableHook is IFeeEstimatableHook, ERC165 {
  /// @notice Error thrown when an estimator function is not implemented
  error EstimatorNotImplemented();

  /**
   * @inheritdoc ERC165
   */
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(ERC165, IERC165) returns (bool) {
    return
      interfaceId == type(IFeeEstimatableHook).interfaceId ||
      super.supportsInterface(interfaceId);
  }

  /// @inheritdoc IFeeEstimatableHook
  function estimateAddCommentFee(
    Comments.Comment calldata commentData,
    Metadata.MetadataEntry[] calldata metadata,
    address msgSender
  ) external view returns (FeeEstimatable.FeeEstimation memory feeEstimation) {
    return _estimateAddCommentFee(commentData, metadata, msgSender);
  }

  /// @inheritdoc IFeeEstimatableHook
  function estimateEditCommentFee(
    Comments.Comment calldata commentData,
    Metadata.MetadataEntry[] calldata metadata,
    address msgSender
  ) external view returns (FeeEstimatable.FeeEstimation memory feeEstimation) {
    return _estimateEditCommentFee(commentData, metadata, msgSender);
  }

  function _estimateAddCommentFee(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    address
  ) internal view virtual returns (FeeEstimatable.FeeEstimation memory) {
    revert EstimatorNotImplemented();
  }

  function _estimateEditCommentFee(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    address
  ) internal view virtual returns (FeeEstimatable.FeeEstimation memory) {
    revert EstimatorNotImplemented();
  }
}
