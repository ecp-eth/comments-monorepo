// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "./IHook.sol";
import "./ICommentTypes.sol";

/// @title IChannelManager - Interface for managing comment channels and their hooks
/// @notice This interface defines the core functionality for managing channels and their associated hooks
interface IChannelManager {
    /// @notice Struct containing channel configuration
    struct ChannelConfig {
        string name;
        string description;
        string metadata;  // Arbitrary JSON metadata
        address owner;
        bool isPrivate;
        bool isArchived;
        IHook[] hooks;
        mapping(address => bool) hookEnabled;
    }

    /// @notice Emitted when a new channel is created
    /// @param channelId The unique identifier of the channel
    /// @param name The name of the channel
    /// @param owner The address of the channel owner
    /// @param metadata The channel metadata
    event ChannelCreated(
        uint256 indexed channelId, 
        string name, 
        address indexed owner,
        string metadata
    );

    /// @notice Emitted when a channel's configuration is updated
    /// @param channelId The unique identifier of the channel
    /// @param name The new name of the channel
    /// @param description The new description of the channel
    /// @param metadata The new metadata
    /// @param isPrivate Whether the channel is private
    /// @param isArchived Whether the channel is archived
    event ChannelUpdated(
        uint256 indexed channelId,
        string name,
        string description,
        string metadata,
        bool isPrivate,
        bool isArchived
    );

    /// @notice Emitted when a hook is added to a channel
    /// @param channelId The unique identifier of the channel
    /// @param hook The address of the hook contract
    event HookAdded(uint256 indexed channelId, address indexed hook);

    /// @notice Emitted when a hook is removed from a channel
    /// @param channelId The unique identifier of the channel
    /// @param hook The address of the hook contract
    event HookRemoved(uint256 indexed channelId, address indexed hook);

    /// @notice Emitted when a hook's enabled status is updated
    /// @param channelId The unique identifier of the channel
    /// @param hook The address of the hook contract
    /// @param enabled Whether the hook is enabled
    event HookStatusUpdated(uint256 indexed channelId, address indexed hook, bool enabled);

    /// @notice Creates a new channel
    /// @param name The name of the channel
    /// @param description The description of the channel
    /// @param metadata The channel metadata (arbitrary JSON)
    /// @param isPrivate Whether the channel is private
    /// @param hooks Array of hook addresses to add to the channel
    /// @return channelId The unique identifier of the created channel
    function createChannel(
        string calldata name,
        string calldata description,
        string calldata metadata,
        bool isPrivate,
        address[] calldata hooks
    ) external returns (uint256);

    /// @notice Updates an existing channel's configuration
    /// @param channelId The unique identifier of the channel
    /// @param name The new name of the channel
    /// @param description The new description of the channel
    /// @param metadata The new metadata
    /// @param isPrivate Whether the channel is private
    /// @param isArchived Whether the channel is archived
    function updateChannel(
        uint256 channelId,
        string calldata name,
        string calldata description,
        string calldata metadata,
        bool isPrivate,
        bool isArchived
    ) external;

    /// @notice Adds a hook to a channel
    /// @param channelId The unique identifier of the channel
    /// @param hook The address of the hook contract
    function addHook(uint256 channelId, address hook) external;

    /// @notice Removes a hook from a channel
    /// @param channelId The unique identifier of the channel
    /// @param hook The address of the hook contract
    function removeHook(uint256 channelId, address hook) external;

    /// @notice Updates a hook's enabled status
    /// @param channelId The unique identifier of the channel
    /// @param hook The address of the hook contract
    /// @param enabled Whether the hook should be enabled
    function setHookEnabled(uint256 channelId, address hook, bool enabled) external;

    /// @notice Gets a channel's configuration
    /// @param channelId The unique identifier of the channel
    /// @return name The name of the channel
    /// @return description The description of the channel
    /// @return metadata The channel metadata
    /// @return owner The address of the channel owner
    /// @return isPrivate Whether the channel is private
    /// @return isArchived Whether the channel is archived
    /// @return hooks Array of hook addresses for the channel
    function getChannel(uint256 channelId) external view returns (
        string memory name,
        string memory description,
        string memory metadata,
        address owner,
        bool isPrivate,
        bool isArchived,
        address[] memory hooks
    );

    /// @notice Checks if a hook is enabled for a channel
    /// @param channelId The unique identifier of the channel
    /// @param hook The address of the hook contract
    /// @return enabled Whether the hook is enabled
    function isHookEnabled(uint256 channelId, address hook) external view returns (bool enabled);

    /// @notice Executes hooks for a channel
    /// @param channelId Unique identifier of the channel
    /// @param commentData Comment data to process
    /// @param caller Address that initiated the transaction
    /// @param commentId Unique identifier of the comment
    /// @param isBeforeHook Whether this is a before or after hook execution
    /// @return success Whether the hook execution was successful
    function executeHooks(
        uint256 channelId,
        ICommentTypes.CommentData memory commentData,
        address caller,
        bytes32 commentId,
        bool isBeforeHook
    ) external payable returns (bool);

    /// @notice Checks if a channel exists
    /// @param channelId Unique identifier of the channel
    /// @return exists Whether the channel exists
    function channelExists(uint256 channelId) external view returns (bool);
} 