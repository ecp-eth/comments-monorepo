// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "./IHook.sol";
import "./IProtocolFees.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import "../libraries/Comments.sol";

/// @title IChannelManager - Interface for managing comment channels and their hooks
/// @notice This interface defines the core functionality for managing channels and their associated hooks
interface IChannelManager is IProtocolFees, IERC721Enumerable {
    /// @notice Struct containing channel configuration
    struct ChannelConfig {
        string name;
        string description;
        string metadata; // Arbitrary JSON metadata
        IHook hook; // Single hook for the channel
        Hooks.Permissions permissions; // Hook permissions
    }

    /// @notice Error thrown when channel does not exist
    error ChannelDoesNotExist();
    /// @notice Error thrown when hook address is invalid
    error InvalidHookAddress();
    /// @notice Error thrown when hook does not implement required interface
    error InvalidHookInterface();
    /// @notice Error thrown when insufficient fee is provided
    error InsufficientFee();
    /// @notice Error thrown when channel already exists
    error ChannelAlreadyExists();
    /// @notice Error thrown when base URI is invalid
    error InvalidBaseURI();
    /// @notice Error thrown when address is zero
    error ZeroAddress();
    /// @notice Error thrown when unauthorized caller tries to access function
    error UnauthorizedCaller();
    /// @notice Error thrown when hook execution fails
    error ChannelHookExecutionFailed();
    /// @notice Error thrown when hook initialization fails
    error HookInitializationFailed();

    /// @notice Emitted when a hook execution fails
    /// @param channelId The unique identifier of the channel
    /// @param hook The address of the hook that failed
    /// @param phase The phase in which the hook failed
    event HookExecutionFailed(
        uint256 indexed channelId,
        address indexed hook,
        Hooks.HookPhase phase
    );

    /// @notice Emitted when the base URI for NFT metadata is updated
    /// @param baseURI The new base URI
    event BaseURIUpdated(string baseURI);

    /// @notice Emitted when a new channel is created
    /// @param channelId The unique identifier of the channel
    /// @param name The name of the channel
    /// @param metadata The channel metadata
    event ChannelCreated(
        uint256 indexed channelId,
        string name,
        string metadata
    );

    /// @notice Emitted when a channel's configuration is updated
    /// @param channelId The unique identifier of the channel
    /// @param name The new name of the channel
    /// @param description The new description of the channel
    /// @param metadata The new metadata
    event ChannelUpdated(
        uint256 indexed channelId,
        string name,
        string description,
        string metadata
    );

    /// @notice Emitted when a hook is set for a channel
    /// @param channelId The unique identifier of the channel
    /// @param hook The address of the hook contract
    event HookSet(uint256 indexed channelId, address indexed hook);

    /// @notice Emitted when a hook's enabled status is updated
    /// @param channelId The unique identifier of the channel
    /// @param hook The address of the hook contract
    /// @param enabled Whether the hook is enabled
    event HookStatusUpdated(
        uint256 indexed channelId,
        address indexed hook,
        bool enabled
    );

    /// @notice Creates a new channel
    /// @param name The name of the channel
    /// @param description The description of the channel
    /// @param metadata The channel metadata (arbitrary JSON)
    /// @param hook Address of the hook to add to the channel
    /// @return channelId The unique identifier of the created channel
    function createChannel(
        string calldata name,
        string calldata description,
        string calldata metadata,
        address hook
    ) external payable returns (uint256 channelId);

    /// @notice Updates an existing channel's configuration
    /// @param channelId The unique identifier of the channel
    /// @param name The new name of the channel
    /// @param description The new description of the channel
    /// @param metadata The new metadata
    function updateChannel(
        uint256 channelId,
        string calldata name,
        string calldata description,
        string calldata metadata
    ) external;

    /// @notice Sets the hook for a channel
    /// @param channelId The unique identifier of the channel
    /// @param hook The address of the hook contract
    function setHook(uint256 channelId, address hook) external;

    /// @notice Gets a channel's configuration
    /// @param channelId The unique identifier of the channel
    /// @return name The name of the channel
    /// @return description The description of the channel
    /// @return metadata The channel metadata
    /// @return hook The address of the channel's hook
    function getChannel(
        uint256 channelId
    )
        external
        view
        returns (
            string memory name,
            string memory description,
            string memory metadata,
            address hook
        );

    /// @notice Updates the comments contract address (only owner)
    /// @param _commentsContract The new comments contract address
    function updateCommentsContract(address _commentsContract) external;

    /// @notice Sets the base URI for NFT metadata
    /// @param baseURI_ The new base URI
    function setBaseURI(string calldata baseURI_) external;

    /// @notice Executes hook for a channel
    /// @param channelId Unique identifier of the channel
    /// @param commentData Comment data to process
    /// @param caller Address that initiated the transaction
    /// @param commentId Unique identifier of the comment
    /// @param phase The phase of hook execution (Before or After)
    /// @return success Whether the hook execution was successful
    function executeHook(
        uint256 channelId,
        Comments.CommentData calldata commentData,
        address caller,
        bytes32 commentId,
        Hooks.HookPhase phase
    ) external payable returns (bool);

    /// @notice Checks if a channel exists
    /// @param channelId Unique identifier of the channel
    /// @return exists Whether the channel exists
    function channelExists(uint256 channelId) external view returns (bool);

    /// @notice Gets the owner of a channel
    /// @param channelId The unique identifier of the channel
    /// @return owner The address of the channel owner
    function getChannelOwner(uint256 channelId) external view returns (address);
}
