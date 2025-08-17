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
import { BaseHook } from "./BaseHook.sol";
import { IFeeEstimatableHook } from "../interfaces/IFeeEstimatableHook.sol";

/**
 * @title FeeEstimatableHook
 * @notice Abstract base contract for all hook implementations
 * @dev Provides default implementations that throw EstimatorNotImplemented if not overridden
 */
abstract contract FeeEstimatableHook is IFeeEstimatableHook, ERC165, BaseHook {
  /// @notice Error thrown when a estimator function is not implemented
  error EstimatorNotImplemented();

  /**
   * @inheritdoc ERC165
   */
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(ERC165, IERC165, BaseHook) returns (bool) {
    return
      interfaceId == type(IFeeEstimatableHook).interfaceId ||
      super.supportsInterface(interfaceId);
  }

  /// @inheritdoc IFeeEstimatableHook
  function getAddCommentFee(
    Comments.Comment calldata commentData,
    Metadata.MetadataEntry[] calldata metadata,
    address msgSender,
    bytes32 commentId
  ) external view returns (uint256 commentAddFee) {
    return _getAddCommentFee(commentData, metadata, msgSender, commentId);
  }

  /// @inheritdoc IFeeEstimatableHook
  function getEditCommentFee(
    Comments.Comment calldata commentData,
    Metadata.MetadataEntry[] calldata metadata,
    address msgSender,
    bytes32 commentId
  ) external view returns (uint256 commentAddFee) {
    return _getEditCommentFee(commentData, metadata, msgSender, commentId);
  }

  function _getAddCommentFee(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32
  ) internal view virtual returns (uint256) {
    revert EstimatorNotImplemented();
  }

  function _getEditCommentFee(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    address,
    bytes32
  ) internal view virtual returns (uint256) {
    revert EstimatorNotImplemented();
  }
}
