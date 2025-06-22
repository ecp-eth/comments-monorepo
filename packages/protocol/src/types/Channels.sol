// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Metadata.sol";
import "./Hooks.sol";

/// @title Channels - Type definitions for channel-related structs
library Channels {
  /// @notice Struct containing channel configuration
  /// @param name The name of the channel
  /// @param description The description of the channel
  /// @param hook The hook of the channel. Hook must implement IHook interface.
  /// @param permissions The hook permissions of the channel
  struct Channel {
    string name;
    string description;
    address hook;
    Hooks.Permissions permissions;
  }
}
