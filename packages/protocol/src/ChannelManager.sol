// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "./interfaces/IHook.sol";
import "./interfaces/IChannelManager.sol";
import "./interfaces/IFeeManager.sol";
import "./ProtocolFees.sol";

/// @title ChannelManager - A contract for managing comment channels and their hooks as NFTs
/// @notice This contract allows creation and management of channels with configurable hooks, where each channel is an NFT
/// @dev Implements channel management with the following security features:
contract ChannelManager is IChannelManager, ProtocolFees, ERC721Enumerable {
    // Mapping from channel ID to channel configuration
    mapping(uint256 => ChannelConfig) private channels;

    // Global hook registry
    mapping(address => HookConfig) private hooks;

    // Base URI for NFT metadata
    string private baseURIValue;

    address public commentsContract;

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

    /// @notice Constructor sets the contract owner and initializes ERC721
    /// @param initialOwner The address that will own the contract
    constructor(
        address initialOwner
    ) ProtocolFees(initialOwner) ERC721("ECP Channel", "ECPC") {
        if (initialOwner == address(0)) revert ZeroAddress();

        // Create default channel with ID 0
        _safeMint(initialOwner, 0);

        ChannelConfig storage channelZero = channels[0];

        channelZero.name = "Home";
        channelZero.description = "Any kind of content";
        channelZero.metadata = "{}";
    }

    modifier onlyCommentsContract() {
        if (msg.sender != commentsContract) revert UnauthorizedCaller();
        _;
    }

    /// @notice Registers a new hook in the global registry
    /// @param hook The address of the hook to register
    function registerHook(address hook) external payable nonReentrant {
        collectHookRegistrationFee();

        if (hook == address(0)) revert IChannelManager.InvalidHookAddress();

        HookConfig storage hookConfig = hooks[hook];

        // Check if hook is already registered
        if (hookConfig.registered)
            revert IChannelManager.HookAlreadyRegistered();

        // Validate that the hook implements IHook interface
        try IERC165(hook).supportsInterface(type(IHook).interfaceId) returns (
            bool result
        ) {
            if (!result) revert IChannelManager.InvalidHookInterface();
        } catch {
            revert IChannelManager.InvalidHookInterface();
        }

        hookConfig.registered = true;
        // Hooks are disabled by default
        hookConfig.enabled = false;

        emit IChannelManager.HookRegistered(hook);
        emit IChannelManager.HookGlobalStatusUpdated(hook, false);
    }

    /// @notice Enables or disables a hook globally (only owner)
    /// @param hook The address of the hook
    /// @param enabled Whether to enable or disable the hook
    function setHookGloballyEnabled(
        address hook,
        bool enabled
    ) external onlyOwner {
        HookConfig storage hookConfig = hooks[hook];
        if (!hookConfig.registered) revert IChannelManager.HookNotRegistered();

        hookConfig.enabled = enabled;
        emit IChannelManager.HookGlobalStatusUpdated(hook, enabled);
    }

    /// @notice Checks if a hook is registered and globally enabled
    /// @param hook The address of the hook
    /// @return hookConfig The hook configuration
    function getHookStatus(
        address hook
    ) external view returns (HookConfig memory) {
        HookConfig memory hookConfig = hooks[hook];
        return hookConfig;
    }

    /// @notice Internal function to check if a channel exists
    /// @param channelId The channel ID to check
    /// @return bool Whether the channel exists
    function _channelExists(
        uint256 channelId
    ) internal view virtual returns (bool) {
        return _ownerOf(channelId) != address(0);
    }

    /// @notice Creates a new channel as an NFT with a hash-based ID
    /// @param name The name of the channel
    /// @param description The description of the channel
    /// @param metadata The channel metadata (arbitrary JSON)
    /// @param hook The address of the hook to add to the channel
    /// @return channelId The unique identifier of the created channel
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

        ChannelConfig storage channel = channels[channelId];

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
    ) external {
        if (!_channelExists(channelId)) revert ChannelDoesNotExist();
        if (ownerOf(channelId) != msg.sender) revert UnauthorizedCaller();

        ChannelConfig storage channel = channels[channelId];

        channel.name = name;
        channel.description = description;
        channel.metadata = metadata;

        emit ChannelUpdated(channelId, name, description, metadata);
    }

    /// @notice Sets the hook for a channel
    /// @param channelId The unique identifier of the channel
    /// @param hook The address of the hook contract
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
            if (!hooks[hook].registered) revert HookNotRegistered();
            channels[channelId].hook = IHook(hook);
        } else {
            delete channels[channelId].hook; // Properly reset to default value
        }

        emit HookSet(channelId, hook);
        emit HookStatusUpdated(channelId, hook, hook != address(0));
    }

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
        )
    {
        if (!_channelExists(channelId)) revert ChannelDoesNotExist();

        ChannelConfig storage channel = channels[channelId];
        return (
            channel.name,
            channel.description,
            channel.metadata,
            address(channel.hook)
        );
    }

    /// @notice Public function to execute hook for a channel
    /// @param channelId The unique identifier of the channel
    /// @param commentData The comment data to process
    /// @param caller The address that initiated the transaction
    /// @param commentId The unique identifier of the comment
    /// @param phase The phase of hook execution (Before or After)
    /// @return success Whether the hook execution was successful
    function executeHooks(
        uint256 channelId,
        ICommentTypes.CommentData memory commentData,
        address caller,
        bytes32 commentId,
        HookPhase phase
    ) external payable onlyCommentsContract returns (bool) {
        if (!_channelExists(channelId)) revert ChannelDoesNotExist();

        ChannelConfig storage channel = channels[channelId];
        address hookAddress = address(channel.hook);

        if (hookAddress == address(0)) {
            return true;
        }

        HookConfig storage hookConfig = hooks[hookAddress];

        // Check both global and channel-specific enablement
        if (!hookConfig.registered) revert HookNotRegistered();
        if (!hookConfig.enabled) revert HookDisabledGlobally();

        // Calculate hook value after protocol fee
        uint256 hookValue = calculateHookTransactionFee(msg.value);

        // Execute the appropriate hook function based on phase
        if (phase == HookPhase.Before) {
            bool success;
            try
                channel.hook.beforeComment{value: hookValue}(
                    commentData,
                    caller,
                    commentId
                )
            returns (bool result) {
                success = result;
            } catch Error(string memory reason) {
                // Propagate the error message
                revert(reason);
            } catch (bytes memory returnData) {
                // Propagate custom errors
                assembly {
                    revert(add(returnData, 0x20), mload(returnData))
                }
            }
            if (!success) revert ChannelHookExecutionFailed();
            return true;
        } else {
            // After phase - don't revert on failure
            bool success = true;
            try
                channel.hook.afterComment(commentData, caller, commentId)
            returns (bool result) {
                success = result;
            } catch {
                emit HookExecutionFailed(channelId, hookAddress, phase);
                return true;
            }
            if (!success) {
                emit HookExecutionFailed(channelId, hookAddress, phase);
            }
            return success;
        }
    }

    /// @notice Check if a channel exists
    /// @param channelId The channel ID to check
    /// @return bool Whether the channel exists
    function channelExists(uint256 channelId) public view returns (bool) {
        try this.ownerOf(channelId) returns (address) {
            return true;
        } catch {
            return false;
        }
    }

    /// @notice Gets the owner of a channel
    /// @param channelId The unique identifier of the channel
    /// @return owner The address of the channel owner
    function getChannelOwner(
        uint256 channelId
    ) external view returns (address) {
        return ownerOf(channelId);
    }

    /// @notice Updates the comments contract address (only owner)
    /// @param _commentsContract The new comments contract address
    function updateCommentsContract(
        address _commentsContract
    ) external onlyOwner {
        if (_commentsContract == address(0)) revert ZeroAddress();
        commentsContract = _commentsContract;
    }

    /// @notice Sets the base URI for NFT metadata
    /// @param baseURI_ The new base URI
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
