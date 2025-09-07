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
import { FeeEstimatable } from "../types/FeeEstimatable.sol";

/**
 * @title FeeEstimatableHook
 * @notice Abstract base contract for hooks do not need a fee
 * @dev Only derive from this contract if the hook absolutely does not need a fee
 */
abstract contract NoFeeHook is BaseHook {
  function estimateAddCommentFee(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    address
  ) external pure returns (FeeEstimatable.FeeEstimation memory feeEstimation) {
    feeEstimation.amount = 0;
    feeEstimation.asset = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
    feeEstimation.description = "Flat fee";
    feeEstimation.metadata = new Metadata.MetadataEntry[](0);

    return feeEstimation;
  }

  function estimateEditCommentFee(
    Comments.Comment calldata,
    Metadata.MetadataEntry[] calldata,
    address
  ) external pure returns (FeeEstimatable.FeeEstimation memory feeEstimation) {
    feeEstimation.amount = 0;
    feeEstimation.asset = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
    feeEstimation.description = "Flat fee";
    feeEstimation.metadata = new Metadata.MetadataEntry[](0);

    return feeEstimation;
  }
}
