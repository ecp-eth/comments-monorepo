// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import "../types/Channels.sol";
import "../types/Metadata.sol";
import "./IHook.sol";
import "./IProtocolFees.sol";

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
  /// @notice Error thrown when metadata key is empty
  error InvalidKey();
  /// @notice Error thrown when channel name is empty
  error EmptyChannelName();
  /// @notice Error thrown when hook is already set
  error HookAlreadySet();

  /// @notice Emitted when the base URI for NFT metadata is updated
  /// @param baseURI The new base URI
  event BaseURIUpdated(string baseURI);

  /// @notice Emitted when a new channel is created
  /// @param channelId The unique identifier of the channel
  /// @param name The name of the channel
  /// @param metadata The channel metadata entries
  event ChannelCreated(
    uint256 indexed channelId,
    string name,
    string description,
    Metadata.MetadataEntry[] metadata,
    address hook,
    address owner
  );

  /// @notice Emitted when a channel's configuration is updated
  /// @param channelId The unique identifier of the channel
  /// @param name The new name of the channel
  /// @param description The new description of the channel
  /// @param metadata The new metadata entries
  event ChannelUpdated(
    uint256 indexed channelId,
    string name,
    string description,
    Metadata.MetadataEntry[] metadata
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

  /// @notice Emitted when channel metadata is set
  /// @param channelId The unique identifier of the channel
  /// @param key The metadata key
  /// @param value The metadata value
  event ChannelMetadataSet(
    uint256 indexed channelId,
    bytes32 indexed key,
    bytes value
  );

  /// @notice Emitted when a channel (NFT) is transferred
  /// @param channelId The unique identifier of the channel
  /// @param from The address of the previous owner
  /// @param to The address of the new owner
  event ChannelTransferred(
    uint256 indexed channelId,
    address indexed from,
    address indexed to
  );

  /// @notice Creates a new channel
  /// @param name The name of the channel
  /// @param description The description of the channel
  /// @param metadata The channel metadata entries
  /// @param hook Address of the hook to add to the channel
  /// @return channelId The unique identifier of the created channel
  function createChannel(
    string calldata name,
    string calldata description,
    Metadata.MetadataEntry[] calldata metadata,
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
  /// @param metadataOperations The new metadata entries as operations
  function updateChannel(
    uint256 channelId,
    string calldata name,
    string calldata description,
    Metadata.MetadataEntryOp[] calldata metadataOperations
  ) external;

  /// @notice Sets the hook for a channel
  /// @param channelId The unique identifier of the channel
  /// @param hook The address of the hook contract
  function setHook(uint256 channelId, address hook) external;

  /// @notice Sets the base URI for NFT metadata
  /// @param baseURI_ The new base URI
  function setBaseURI(string calldata baseURI_) external;

  /// @notice Checks if a channel exists
  /// @param channelId Unique identifier of the channel
  /// @return exists Whether the channel exists
  function channelExists(uint256 channelId) external view returns (bool);

  /// @notice Get all metadata for a channel
  /// @param channelId The unique identifier of the channel
  /// @return The metadata entries for the channel
  function getChannelMetadata(
    uint256 channelId
  ) external view returns (Metadata.MetadataEntry[] memory);

  /// @notice Get metadata value for a specific key
  /// @param channelId The unique identifier of the channel
  /// @param key The metadata key
  /// @return The metadata value
  function getChannelMetadataValue(
    uint256 channelId,
    bytes32 key
  ) external view returns (bytes memory);

  /// @notice Get all metadata keys for a channel
  /// @param channelId The unique identifier of the channel
  /// @return The metadata keys for the channel
  function getChannelMetadataKeys(
    uint256 channelId
  ) external view returns (bytes32[] memory);
}
