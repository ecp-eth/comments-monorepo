// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IFeeCollector.sol";
import "./interfaces/ITimelockFeeController.sol";
import "./interfaces/ICommentTypes.sol";

/// @title TimelockFeeController
/// @notice Abstract contract implementing time-locked fee collector changes with reentrancy protection
/// @dev Inherit from this contract to add time-locked fee collector functionality
/// @dev This contract implements a secure fee collection system with the following security features:
/// - Reentrancy protection on all state-changing functions
/// - Time-locked changes to fee collector configuration (48 hour delay)
/// - Emergency pause functionality
/// - Owner-only administrative functions
/// - Checks-Effects-Interactions pattern
abstract contract TimelockFeeController is Ownable, ReentrancyGuard, ITimelockFeeController {
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

    /// @notice Error thrown when fee collector address is zero
    error InvalidFeeCollectorAddress();
    /// @notice Error thrown when trying to execute changes before timelock expires
    error TimelockDeadlineNotReached();
    /// @notice Error thrown when fee collection operation fails
    error FeeCollectionFailed(address collector, uint256 amount);
    /// @notice Error thrown when system is paused
    error SystemPaused();
    /// @notice Error thrown when no pending change exists
    error NoPendingFeeCollectorChange();

    /// @notice Emitted when fee system is paused
    /// @param ownerAddress Address of the owner who paused the system
    event FeesystemPaused(address indexed ownerAddress);
    
    /// @notice Emitted when fee system is unpaused
    /// @param ownerAddress Address of the owner who unpaused the system
    event FeesystemUnpaused(address indexed ownerAddress);

    /// @notice Constructor that sets the owner of the contract
    /// @param initialOwner The address that will own the contract
    constructor(address initialOwner) Ownable(initialOwner) {
        paused = false;
    }

    /// @notice Pause fee collection in case of emergency
    /// @dev Only callable by owner, prevents any new fee collection
    function pause() external onlyOwner {
        paused = true;
        emit FeesystemPaused(msg.sender);
    }

    /// @notice Unpause fee collection
    /// @dev Only callable by owner, re-enables fee collection
    function unpause() external onlyOwner {
        paused = false;
        emit FeesystemUnpaused(msg.sender);
    }

    /// @notice Schedule a change to the fee collector configuration
    /// @dev Implements a 48-hour timelock before changes can take effect
    /// @param feeCollectorAddress Address of the new fee collector contract
    /// @param enabled Whether fee collection will be enabled
    function scheduleFeeCollectorChange(
        address feeCollectorAddress,
        bool enabled
    ) external onlyOwner {
        if (feeCollectorAddress == address(0)) revert InvalidFeeCollectorAddress();
        
        // Cancel any existing pending change
        if (pendingChange.exists) {
            emit FeeCollectorChangeCancelled(pendingChange.collector, pendingChange.enabled);
        }

        uint256 effectiveTime = block.timestamp + CHANGE_DELAY;
        pendingChange = PendingFeeCollectorChange({
            collector: feeCollectorAddress,
            enabled: enabled,
            effectiveTime: effectiveTime,
            exists: true
        });

        emit FeeCollectorChangeScheduled(feeCollectorAddress, enabled, effectiveTime);
    }

    /// @notice Execute a pending fee collector change after the delay period
    /// @dev Can be called by anyone after the timelock period expires
    function executeFeeCollectorChange() external nonReentrant {
        if (!pendingChange.exists) revert NoPendingFeeCollectorChange();
        if (block.timestamp < pendingChange.effectiveTime) revert TimelockDeadlineNotReached();

        feeCollectorConfig = FeeCollectorConfig({
            collector: IFeeCollector(pendingChange.collector),
            enabled: pendingChange.enabled
        });

        emit FeeCollectorChanged(pendingChange.collector, pendingChange.enabled);

        delete pendingChange;
    }

    /// @notice Cancel a pending fee collector change
    /// @dev Only callable by owner
    function cancelFeeCollectorChange() external onlyOwner {
        if (!pendingChange.exists) revert NoPendingFeeCollectorChange();

        emit FeeCollectorChangeCancelled(pendingChange.collector, pendingChange.enabled);

        delete pendingChange;
    }

    /// @notice Get the current pending fee collector change, if any
    /// @return collector Address of the pending collector
    /// @return enabled Whether fee collection will be enabled
    /// @return effectiveTime Timestamp when the change can be executed
    /// @return exists Whether there is a pending change
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
    /// @dev Implements reentrancy protection and follows checks-effects-interactions pattern
    /// @dev Fee collection flow:
    /// 1. Check system state (paused, enabled, collector configured)
    /// 2. Forward the fee to the collector contract
    /// 3. Verify successful collection
    /// @param commentData The comment data to collect fees for
    function _collectFee(ICommentTypes.CommentData memory commentData) internal nonReentrant {
        // If system is paused or fee collection is disabled or no collector is set, return immediately
        if (paused || !feeCollectorConfig.enabled || address(feeCollectorConfig.collector) == address(0)) {
            return;
        }

        // Delegate fee collection to the collector
        bool success = feeCollectorConfig.collector.collectFee{value: msg.value}(commentData);
        if (!success) revert FeeCollectionFailed(address(feeCollectorConfig.collector), msg.value);
    }
} 