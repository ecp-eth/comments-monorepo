// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Metadata.sol";

/// @title FeeEstimatable - types used by fee-estimatable hooks
library FeeEstimatable {
  address constant NATIVE_TOKEN_ADDRESS =
    0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
  /// @notice Details of a fee estimation
  /// @param amount The fee required for the specific comment action
  /// @param asset The address of the asset, use 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE for the native token
  /// @param description A description of the hook's behaviour, gating rules and any fee that can be shown by apps to the user
  /// @param metadata Additional app-specific data of the estimation
  struct FeeEstimation {
    uint256 amount;
    address asset;
    string description;
    Metadata.MetadataEntry[] metadata;
  }
}
