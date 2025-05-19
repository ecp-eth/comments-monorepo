// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "./interfaces/IChannelManager.sol";
import "./interfaces/IProtocolFees.sol";
import "./ProtocolFees.sol";
import "./libraries/Comments.sol";
import "./libraries/Channels.sol";

/// @title ChannelManager - A contract for managing comment channels and their hooks as NFTs
/// @notice This contract allows creation and management of channels with configurable hooks, where each channel is an NFT
/// @dev Implements channel management with the following security features:
contract ChannelManager is IChannelManager, ProtocolFees, ERC721Enumerable {
    /// @notice Base URI for NFT metadata
    string internal baseURIValue;

    /// @notice Address of the comments contract
    address internal commentsContract;

    // Mapping from channel ID to channel configuration
    mapping(uint256 => Channels.Channel) internal channels;

    /// @notice Constructor sets the contract owner and initializes ERC721
    /// @param initialOwner The address that will own the contract
    constructor(
        address initialOwner
    ) ProtocolFees(initialOwner) ERC721("ECP Channel", "ECPC") {
        if (initialOwner == address(0)) revert ZeroAddress();

        // Create default channel with ID 0
        _safeMint(initialOwner, 0);

        Channels.Channel storage channelZero = channels[0];

        channelZero.name = "Home";
        channelZero.description = "Any kind of content";
        channelZero.metadata = "{}";
    }

    modifier onlyCommentsContract() {
        if (msg.sender != commentsContract) revert UnauthorizedCaller();
        _;
    }

    /// @inheritdoc IChannelManager
    function getChannel(
        uint256 channelId
    ) external view returns (Channels.Channel memory) {
        if (!_channelExists(channelId)) revert ChannelDoesNotExist();
        return channels[channelId];
    }

    /// @notice Generates a unique channel ID based on input parameters
    /// @param creator The address creating the channel
    /// @param name The name of the channel
    /// @param description The description of the channel
    /// @param metadata The channel metadata
    /// @return channelId The generated channel ID
    function _generateChannelId(
        address creator,
        string memory name,
        string memory description,
        string memory metadata
    ) internal view returns (uint256) {
        return
            uint256(
                keccak256(
                    abi.encodePacked(
                        creator,
                        name,
                        description,
                        metadata,
                        block.timestamp,
                        block.chainid
                    )
                )
            );
    }

    /// @notice Internal function to check if a channel exists
    /// @param channelId The channel ID to check
    /// @return bool Whether the channel exists
    function _channelExists(
        uint256 channelId
    ) internal view virtual returns (bool) {
        return _ownerOf(channelId) != address(0);
    }

    /// @inheritdoc IChannelManager
    function createChannel(
        string calldata name,
        string calldata description,
        string calldata metadata,
        address hook
    ) external payable returns (uint256 channelId) {
        if (msg.sender == address(0)) revert ZeroAddress();
        collectChannelCreationFee();

        // Generate channel ID using the internal function
        channelId = _generateChannelId(msg.sender, name, description, metadata);

        // Ensure channel ID doesn't already exist
        if (_channelExists(channelId)) revert ChannelAlreadyExists();

        _safeMint(msg.sender, channelId);

        Channels.Channel storage channel = channels[channelId];

        channel.name = name;
        channel.description = description;
        channel.metadata = metadata;

        // Add hook if provided
        if (hook != address(0)) {
            _setHook(channelId, hook);
        }

        emit ChannelCreated(channelId, name, metadata);
        return channelId;
    }

    /// @inheritdoc IChannelManager
    function updateChannel(
        uint256 channelId,
        string calldata name,
        string calldata description,
        string calldata metadata
    ) external {
        if (!_channelExists(channelId)) revert ChannelDoesNotExist();
        if (ownerOf(channelId) != msg.sender) revert UnauthorizedCaller();

        Channels.Channel storage channel = channels[channelId];

        channel.name = name;
        channel.description = description;
        channel.metadata = metadata;

        emit ChannelUpdated(channelId, name, description, metadata);
    }

    /// @inheritdoc IChannelManager
    function setHook(uint256 channelId, address hook) external {
        if (!_channelExists(channelId)) revert ChannelDoesNotExist();
        if (ownerOf(channelId) != msg.sender) revert UnauthorizedCaller();

        return _setHook(channelId, hook);
    }

    /// @notice Internal function to set the hook for a channel
    /// @param channelId The unique identifier of the channel
    /// @param hook The address of the hook contract
    function _setHook(uint256 channelId, address hook) internal {
        if (hook != address(0)) {
            // Validate that the hook implements IHook interface
            try
                IERC165(hook).supportsInterface(type(IHook).interfaceId)
            returns (bool result) {
                if (!result) revert InvalidHookInterface();
            } catch {
                revert InvalidHookInterface();
            }

            // Get hook permissions and store them on the channel
            Hooks.Permissions memory permissions = IHook(hook)
                .getHookPermissions();

            channels[channelId].hook = IHook(hook);
            channels[channelId].permissions = permissions;

            // Call afterInitialize hook if permitted
            if (permissions.afterInitialize) {
                IHook(hook).afterInitialize(address(this));
            }
        } else {
            delete channels[channelId].hook; // Properly reset to default value
        }

        emit HookSet(channelId, hook);
        emit HookStatusUpdated(channelId, hook, hook != address(0));
    }

    /// @inheritdoc IChannelManager
    function channelExists(uint256 channelId) public view returns (bool) {
        try this.ownerOf(channelId) returns (address) {
            return true;
        } catch {
            return false;
        }
    }

    /// @inheritdoc IChannelManager
    function getChannelOwner(
        uint256 channelId
    ) external view returns (address) {
        return ownerOf(channelId);
    }

    /// @inheritdoc IChannelManager
    function updateCommentsContract(
        address _commentsContract
    ) external onlyOwner {
        if (_commentsContract == address(0)) revert ZeroAddress();
        commentsContract = _commentsContract;
    }

    /// @inheritdoc IChannelManager
    function setBaseURI(string calldata baseURI_) external onlyOwner {
        if (bytes(baseURI_).length == 0)
            revert IChannelManager.InvalidBaseURI();
        baseURIValue = baseURI_;
        emit IChannelManager.BaseURIUpdated(baseURI_);
    }

    /// @notice Returns the base URI for token metadata
    /// @dev Internal function that overrides ERC721's _baseURI()
    function _baseURI() internal view virtual override returns (string memory) {
        return baseURIValue;
    }
}
