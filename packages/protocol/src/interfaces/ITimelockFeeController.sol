// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IFeeCollector.sol";

interface ITimelockFeeController {
    /// @notice Emitted when a new fee collector change is scheduled
    /// @param collector The address of the new fee collector
    /// @param enabled Whether fee collection will be enabled
    /// @param effectiveTime The timestamp when the change will take effect
    event FeeCollectorChangeScheduled(
        address indexed collector,
        bool enabled,
        uint256 effectiveTime
    );

    /// @notice Emitted when a fee collector change is executed
    /// @param collector The address of the new fee collector
    /// @param enabled Whether fee collection is enabled
    event FeeCollectorChanged(address indexed collector, bool enabled);

    /// @notice Emitted when a pending fee collector change is cancelled
    /// @param collector The address of the cancelled collector
    /// @param enabled Whether fee collection would have been enabled
    event FeeCollectorChangeCancelled(address indexed collector, bool enabled);

    /// @notice Schedule a change to the fee collector configuration
    /// @param collector Address of the new fee collector contract
    /// @param enabled Whether fee collection will be enabled
    function scheduleFeeCollectorChange(address collector, bool enabled) external;

    /// @notice Execute a pending fee collector change after the delay period
    function executeFeeCollectorChange() external;

    /// @notice Cancel a pending fee collector change
    function cancelFeeCollectorChange() external;

    /// @notice Get the current pending fee collector change, if any
    /// @return collector The pending collector address
    /// @return enabled Whether fee collection will be enabled
    /// @return effectiveTime The timestamp when the change can be executed
    /// @return exists Whether there is a pending change
    function getPendingFeeCollectorChange() external view returns (
        address collector,
        bool enabled,
        uint256 effectiveTime,
        bool exists
    );
} 