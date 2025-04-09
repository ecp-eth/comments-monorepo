// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IHook.sol";

interface ITimelockHookController {
    /// @notice Emitted when a new hook change is scheduled
    /// @param hook The address of the new hook
    /// @param enabled Whether hook execution will be enabled
    /// @param effectiveTime The timestamp when the change will take effect
    event HookChangeScheduled(
        address indexed hook,
        bool enabled,
        uint256 effectiveTime
    );

    /// @notice Emitted when a hook change is executed
    /// @param hook The address of the new hook
    /// @param enabled Whether hook execution is enabled
    event HookChanged(address indexed hook, bool enabled);

    /// @notice Emitted when a pending hook change is cancelled
    /// @param hook The address of the cancelled hook
    /// @param enabled Whether hook execution would have been enabled
    event HookChangeCancelled(address indexed hook, bool enabled);

    /// @notice Schedule a change to the hook configuration
    /// @param hook Address of the new hook contract
    /// @param enabled Whether hook execution will be enabled
    function scheduleHookChange(address hook, bool enabled) external;

    /// @notice Execute a pending hook change after the delay period
    function executeHookChange() external;

    /// @notice Cancel a pending hook change
    function cancelHookChange() external;

    /// @notice Get the current pending hook change, if any
    /// @return hook The pending hook address
    /// @return enabled Whether hook execution will be enabled
    /// @return effectiveTime The timestamp when the change can be executed
    /// @return exists Whether there is a pending change
    function getPendingHookChange() external view returns (
        address hook,
        bool enabled,
        uint256 effectiveTime,
        bool exists
    );
} 