// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Hooks
 * @notice Library containing hook-related types and utilities
 */
library Hooks {
    /**
     * @notice Struct defining which hook functions are enabled
     * @dev Each boolean indicates whether the corresponding hook function is enabled
     */
    struct Permissions {
        bool beforeInitialize;
        bool afterInitialize;
        bool beforeComment;
        bool afterComment;
        bool beforeDeleteComment;
        bool afterDeleteComment;
    }

    /// @notice Enum defining the phase of hook execution
    enum HookPhase {
        BeforeComment,
        AfterComment,
        BeforeDeleteComment,
        AfterDeleteComment
    }
} 