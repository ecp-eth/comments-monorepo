// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "./interfaces/IHook.sol";
import "./interfaces/ITimelockHookController.sol";
import "./interfaces/ICommentTypes.sol";

/// @title TimelockHookController
/// @notice Abstract contract implementing time-locked hook changes with reentrancy protection
/// @dev Inherit from this contract to add time-locked hook functionality
/// @dev This contract implements a secure hook system with the following security features:
/// - Reentrancy protection on all state-changing functions
/// - Time-locked changes to hook configuration (48 hour delay)
/// - Emergency pause functionality
/// - Owner-only administrative functions
/// - Checks-Effects-Interactions pattern
abstract contract TimelockHookController is Ownable, ReentrancyGuard, ITimelockHookController {
    /// @notice Struct containing hook configuration
    struct HookConfig {
        IHook hook;
        bool enabled;
    }

    /// @notice Struct containing pending hook change
    struct PendingHookChange {
        address hook;
        bool enabled;
        uint256 effectiveTime;
        bool exists;
    }

    uint256 public constant CHANGE_DELAY = 48 hours;

    // Current hook configuration
    HookConfig public hookConfig;
    
    // Pending change storage
    PendingHookChange public pendingChange;

    // Emergency pause state
    bool public paused;

    /// @notice Error thrown when hook address is zero
    error InvalidHookAddress();
    /// @notice Error thrown when hook does not implement required interface
    error InvalidHookInterface();
    /// @notice Error thrown when trying to execute changes before timelock expires
    error TimelockDeadlineNotReached();
    /// @notice Error thrown when hook operation fails
    error HookExecutionFailed(address hook);
    /// @notice Error thrown when system is paused
    error SystemPaused();
    /// @notice Error thrown when no pending change exists
    error NoPendingHookChange();

    /// @notice Emitted when hook system is paused
    /// @param ownerAddress Address of the owner who paused the system
    event HookSystemPaused(address indexed ownerAddress);
    
    /// @notice Emitted when hook system is unpaused
    /// @param ownerAddress Address of the owner who unpaused the system
    event HookSystemUnpaused(address indexed ownerAddress);

    /// @notice Constructor that sets the owner of the contract
    /// @param initialOwner The address that will own the contract
    constructor(address initialOwner) Ownable(initialOwner) {
        paused = false;
    }

    /// @notice Pause hook execution in case of emergency
    /// @dev Only callable by owner, prevents any new hook execution
    function pause() external onlyOwner {
        paused = true;
        emit HookSystemPaused(msg.sender);
    }

    /// @notice Unpause hook execution
    /// @dev Only callable by owner, re-enables hook execution
    function unpause() external onlyOwner {
        paused = false;
        emit HookSystemUnpaused(msg.sender);
    }

    /// @notice Schedule a change to the hook configuration
    /// @dev Implements a 48-hour timelock before changes can take effect
    /// @param hookAddress Address of the new hook contract
    /// @param enabled Whether hook execution will be enabled
    function scheduleHookChange(
        address hookAddress,
        bool enabled
    ) external onlyOwner {
        if (hookAddress == address(0)) revert InvalidHookAddress();
        
        // Validate that the hook implements IHook interface
        if (!IERC165(hookAddress).supportsInterface(type(IHook).interfaceId)) {
            revert InvalidHookInterface();
        }

        // Cancel any existing pending change
        if (pendingChange.exists) {
            emit HookChangeCancelled(pendingChange.hook, pendingChange.enabled);
        }

        uint256 effectiveTime = block.timestamp + CHANGE_DELAY;
        pendingChange = PendingHookChange({
            hook: hookAddress,
            enabled: enabled,
            effectiveTime: effectiveTime,
            exists: true
        });

        emit HookChangeScheduled(hookAddress, enabled, effectiveTime);
    }

    /// @notice Execute a pending hook change after the delay period
    /// @dev Can be called by anyone after the timelock period expires
    function executeHookChange() external nonReentrant {
        if (!pendingChange.exists) revert NoPendingHookChange();
        if (block.timestamp < pendingChange.effectiveTime) revert TimelockDeadlineNotReached();

        hookConfig = HookConfig({
            hook: IHook(pendingChange.hook),
            enabled: pendingChange.enabled
        });

        emit HookChanged(pendingChange.hook, pendingChange.enabled);

        delete pendingChange;
    }

    /// @notice Cancel a pending hook change
    /// @dev Only callable by owner
    function cancelHookChange() external onlyOwner {
        if (!pendingChange.exists) revert NoPendingHookChange();

        emit HookChangeCancelled(pendingChange.hook, pendingChange.enabled);

        delete pendingChange;
    }

    /// @notice Get the current pending hook change, if any
    /// @return hook Address of the pending hook
    /// @return enabled Whether hook execution will be enabled
    /// @return effectiveTime Timestamp when the change can be executed
    /// @return exists Whether there is a pending change
    function getPendingHookChange() external view returns (
        address hook,
        bool enabled,
        uint256 effectiveTime,
        bool exists
    ) {
        return (
            pendingChange.hook,
            pendingChange.enabled,
            pendingChange.effectiveTime,
            pendingChange.exists
        );
    }

    /// @notice Internal function to handle hook execution
    /// @dev Implements reentrancy protection and follows checks-effects-interactions pattern
    /// @dev Hook execution flow:
    /// 1. Check system state (paused, enabled, hook configured)
    /// 2. Execute the beforeComment hook
    /// 3. Verify successful execution
    /// @param commentData The comment data to execute hooks for
    /// @param commentId The unique identifier of the comment being processed
    function _executeBeforeCommentHook(ICommentTypes.CommentData memory commentData, bytes32 commentId) internal nonReentrant {
        // If system is paused or hook execution is disabled or no hook is set, return immediately
        if (paused || !hookConfig.enabled || address(hookConfig.hook) == address(0)) {
            return;
        }

        // Execute the beforeComment hook
        bool success = hookConfig.hook.beforeComment{value: msg.value}(commentData, msg.sender, commentId);
        if (!success) revert HookExecutionFailed(address(hookConfig.hook));
    }

    /// @notice Internal function to handle after comment hook execution
    /// @param commentData The comment data to execute hooks for
    /// @param commentId The unique identifier of the processed comment
    function _executeAfterCommentHook(ICommentTypes.CommentData memory commentData, bytes32 commentId) internal nonReentrant {
        // If system is paused or hook execution is disabled or no hook is set, return immediately
        if (paused || !hookConfig.enabled || address(hookConfig.hook) == address(0)) {
            return;
        }

        // Execute the afterComment hook
        bool success = hookConfig.hook.afterComment(commentData, msg.sender, commentId);
        if (!success) revert HookExecutionFailed(address(hookConfig.hook));
    }
} 