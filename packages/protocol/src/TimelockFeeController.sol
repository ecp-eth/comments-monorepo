// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IFeeCollector.sol";
import "./interfaces/ITimelockFeeController.sol";
import "./interfaces/ICommentTypes.sol";

/// @title TimelockFeeController
/// @notice Abstract contract implementing time-locked fee collector changes
/// @dev Inherit from this contract to add time-locked fee collector functionality
abstract contract TimelockFeeController is Ownable, ITimelockFeeController {
    /// @notice Struct containing fee collector configuration
    struct FeeCollectorConfig {
        IFeeCollector collector;
        bool enabled;
    }

    /// @notice Struct containing pending fee collector change
    struct PendingFeeCollectorChange {
        address collector;
        bool enabled;
        uint256 effectiveTime;
        bool exists;
    }

    uint256 public constant CHANGE_DELAY = 48 hours;

    // Current fee collector configuration
    FeeCollectorConfig public feeCollectorConfig;
    
    // Pending change storage
    PendingFeeCollectorChange public pendingChange;

    // Emergency pause state
    bool public paused;

    error InvalidFeeConfiguration();
    error DeadlineNotReached();
    error FeeCollectionFailed();
    error SystemPaused();

    event FeesystemPaused(address indexed owner);
    event FeesystemUnpaused(address indexed owner);

    /// @notice Constructor that sets the owner of the contract
    /// @param initialOwner The address that will own the contract
    constructor(address initialOwner) Ownable(initialOwner) {
        paused = false;
    }

    /// @notice Pause fee collection in case of emergency
    function pause() external onlyOwner {
        paused = true;
        emit FeesystemPaused(msg.sender);
    }

    /// @notice Unpause fee collection
    function unpause() external onlyOwner {
        paused = false;
        emit FeesystemUnpaused(msg.sender);
    }

    /// @notice Schedule a change to the fee collector configuration
    /// @param collector Address of the new fee collector contract
    /// @param enabled Whether fee collection will be enabled
    function scheduleFeeCollectorChange(
        address collector,
        bool enabled
    ) external onlyOwner {
        if (collector == address(0)) revert InvalidFeeConfiguration();
        
        // Cancel any existing pending change
        if (pendingChange.exists) {
            emit FeeCollectorChangeCancelled(pendingChange.collector, pendingChange.enabled);
        }

        uint256 effectiveTime = block.timestamp + CHANGE_DELAY;
        pendingChange = PendingFeeCollectorChange({
            collector: collector,
            enabled: enabled,
            effectiveTime: effectiveTime,
            exists: true
        });

        emit FeeCollectorChangeScheduled(collector, enabled, effectiveTime);
    }

    /// @notice Execute a pending fee collector change after the delay period
    function executeFeeCollectorChange() external {
        if (!pendingChange.exists) revert InvalidFeeConfiguration();
        if (block.timestamp < pendingChange.effectiveTime) revert DeadlineNotReached();

        feeCollectorConfig = FeeCollectorConfig({
            collector: IFeeCollector(pendingChange.collector),
            enabled: pendingChange.enabled
        });

        emit FeeCollectorChanged(pendingChange.collector, pendingChange.enabled);

        delete pendingChange;
    }

    /// @notice Cancel a pending fee collector change
    function cancelFeeCollectorChange() external onlyOwner {
        if (!pendingChange.exists) revert InvalidFeeConfiguration();

        emit FeeCollectorChangeCancelled(pendingChange.collector, pendingChange.enabled);

        delete pendingChange;
    }

    /// @notice Get the current pending fee collector change, if any
    function getPendingFeeCollectorChange() external view returns (
        address collector,
        bool enabled,
        uint256 effectiveTime,
        bool exists
    ) {
        return (
            pendingChange.collector,
            pendingChange.enabled,
            pendingChange.effectiveTime,
            pendingChange.exists
        );
    }

    /// @notice Internal function to handle fee collection
    /// @dev Delegates fee collection to the configured collector if enabled
    /// @param commentData The comment data to collect fees for
    function _collectFee(ICommentTypes.CommentData memory commentData) internal virtual {
        // If system is paused or fee collection is disabled or no collector is set, return immediately
        if (paused || !feeCollectorConfig.enabled || address(feeCollectorConfig.collector) == address(0)) {
            return;
        }

        // Delegate fee collection to the collector
        bool success = feeCollectorConfig.collector.collectFee{value: msg.value}(commentData);
        if (!success) revert FeeCollectionFailed();
    }
} 