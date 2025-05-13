// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "../interfaces/IHook.sol";

/// @title Channels - Library defining channel-related types
library Channels {
    /// @notice Struct containing channel configuration
    struct Channel {
        string name;
        string description;
        string metadata; // Arbitrary JSON metadata
        IHook hook; // Single hook for the channel
        Hooks.Permissions permissions; // Hook permissions
    }
} 
