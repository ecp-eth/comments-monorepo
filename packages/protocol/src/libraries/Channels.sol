// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "../interfaces/IHook.sol";

/// @title Channels - Library defining channel-related types
library Channels {
    /// @notice Struct containing channel configuration
    /// @param name The name of the channel
    /// @param description The description of the channel
    /// @param metadata The metadata of the channel
    /// @param hook The hook of the channel
    /// @param permissions The hook permissions of the channel
    struct Channel {
        string name;
        string description;
        string metadata; 
        IHook hook; 
        Hooks.Permissions permissions;
    }
} 
