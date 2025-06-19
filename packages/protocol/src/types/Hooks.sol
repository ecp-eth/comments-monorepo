// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Hooks
 * @notice Type definitions for hook-related structs
 */
library Hooks {
  /**
   * @notice Struct defining which hook functions are enabled
   * @dev Each boolean indicates whether the corresponding hook function is enabled
   */
  struct Permissions {
    bool onInitialize;
    bool onCommentAdd;
    bool onCommentDelete;
    bool onCommentEdit;
    bool onChannelUpdate;
    bool onCommentHookDataUpdate;
  }
}
