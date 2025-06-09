// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IHook.sol";
import "./IProtocolFees.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import "../libraries/Comments.sol";
import "../libraries/Channels.sol";

/// @title IChannelManager - Interface for managing comment channels and their hooks
/// @notice This interface defines the core functionality for managing channels and their associated hooks
interface IChannelManager is IProtocolFees, IERC721Enumerable {
  /// @notice Error thrown when channel does not exist
  error ChannelDoesNotExist();
  /// @notice Error thrown when hook does not implement required interface
  error InvalidHookInterface();
  /// @notice Error thrown when channel already exists
  error ChannelAlreadyExists();
  /// @notice Error thrown when base URI is invalid
  error InvalidBaseURI();
  /// @notice Error thrown when address is zero
  error ZeroAddress();
  /// @notice Error thrown when unauthorized caller tries to access function
  error UnauthorizedCaller();

  /// @notice Emitted when the base URI for NFT metadata is updated
  /// @param baseURI The new base URI
  event BaseURIUpdated(string baseURI);

  /// @notice Emitted when a new channel is created
  /// @param channelId The unique identifier of the channel
  /// @param name The name of the channel
  /// @param metadata The channel metadata
  event ChannelCreated(uint256 indexed channelId, string name, string metadata);

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

  /// @notice Get a channel by its ID
  /// @param channelId The ID of the channel to get
  /// @return The channel configuration
  function getChannel(
    uint256 channelId
  ) external view returns (Channels.Channel memory);

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

  /// @notice Updates the comments contract address (only owner)
  /// @param _commentsContract The new comments contract address
  function updateCommentsContract(address _commentsContract) external;

  /// @notice Sets the base URI for NFT metadata
  /// @param baseURI_ The new base URI
  function setBaseURI(string calldata baseURI_) external;

  /// @notice Checks if a channel exists
  /// @param channelId Unique identifier of the channel
  /// @return exists Whether the channel exists
  function channelExists(uint256 channelId) external view returns (bool);
}
