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

/// @title ChannelManager - A contract for managing comment channels and their hooks as NFTs
/// @notice This contract allows creation and management of channels with configurable hooks, where each channel is an NFT
/// @dev Implements channel management with the following security features:
/// 1. Access Control:
///    - Only channel owners (NFT holders) can modify their channels
///    - Channel owners can add/remove hooks
///    - Channel owners can enable/disable hooks
/// 2. Hook System:
///    - Each channel can have one hook
///    - Hooks must implement IHook interface
///    - Hooks can be enabled/disabled
/// 3. Data Integrity:
///    - Channel IDs are sequential and match NFT token IDs
///    - Channel configurations are immutable unless changed by owner
/// 4. NFT Features:
///    - Each channel is a unique NFT
///    - Channels can be transferred between owners
///    - Supports standard NFT interfaces
contract ChannelManager is IChannelManager, IFeeManager, Ownable, ReentrancyGuard, ERC721Enumerable {
    /// @notice Error thrown when channel does not exist
    error ChannelDoesNotExist();
    /// @notice Error thrown when caller is not the channel owner
    error NotChannelOwner();
    /// @notice Error thrown when hook address is invalid
    error InvalidHookAddress();
    /// @notice Error thrown when hook does not implement required interface
    error InvalidHookInterface();
    /// @notice Error thrown when channel already has a hook
    error ChannelAlreadyHasHook();
    /// @notice Error thrown when hook is not added to channel
    error HookNotFound();
    /// @notice Error thrown when hook is not registered
    error HookNotRegistered();
    /// @notice Error thrown when hook is disabled globally
    error HookDisabledGlobally();
    /// @notice Error thrown when insufficient fee is provided
    error InsufficientFee();

    /// @notice Emitted when a hook is registered in the global registry
    /// @param hook The address of the registered hook
    event HookRegistered(address indexed hook);

    /// @notice Emitted when a hook's global enabled status is updated
    /// @param hook The address of the hook
    /// @param enabled Whether the hook is enabled globally
    event HookGlobalStatusUpdated(address indexed hook, bool enabled);

    // Mapping from channel ID to channel configuration
    mapping(uint256 => ChannelConfig) private channels;
    // Counter for channel/token IDs
    uint256 private _nextTokenId;

    // Global hook registry
    mapping(address => bool) private registeredHooks;
    mapping(address => bool) private globallyEnabledHooks;

    // Fee configuration
    uint256 private channelCreationFee;
    uint256 private hookRegistrationFee;
    uint16 private hookTransactionFeePercentage; // In basis points (1% = 100)
    uint256 private accumulatedFees;

    address public commentsContract;
    
    error UnauthorizedCaller();

    /// @notice Constructor sets the contract owner and initializes ERC721
    /// @param initialOwner The address that will own the contract
    constructor(address initialOwner, address _commentsContract) 
        Ownable(initialOwner) 
        ERC721("ECP Channel", "ECPC") 
    {
        // Initialize fees to 0
        channelCreationFee = 0;
        hookRegistrationFee = 0;
        hookTransactionFeePercentage = 0;
        accumulatedFees = 0;

        // Create default channel 0
        _nextTokenId = 0;
        _safeMint(initialOwner, _nextTokenId);

        channels[_nextTokenId].name = "Home";
        channels[_nextTokenId].description = "Any kind of content";
        channels[_nextTokenId].metadata = "{}";
        channels[_nextTokenId].owner = initialOwner;
        channels[_nextTokenId].isPrivate = false;
        channels[_nextTokenId].isArchived = false;

        _nextTokenId++;

        commentsContract = _commentsContract;
    }

    modifier onlyCommentsContract() {
        if (msg.sender != commentsContract) revert UnauthorizedCaller();
        _;
    }

    /// @notice Sets the fee for creating a new channel (only owner)
    /// @param fee The fee amount in wei
    function setChannelCreationFee(uint256 fee) external onlyOwner {
        channelCreationFee = fee;
        emit IFeeManager.ChannelCreationFeeUpdated(fee);
    }

    /// @notice Sets the fee for registering a new hook (only owner)
    /// @param fee The fee amount in wei
    function setHookRegistrationFee(uint256 fee) external onlyOwner {
        hookRegistrationFee = fee;
        emit IFeeManager.HookRegistrationFeeUpdated(fee);
    }

    /// @notice Sets the fee percentage taken from hook transactions (only owner)
    /// @param feePercentage The fee percentage in basis points (1% = 100)
    function setHookTransactionFee(uint16 feePercentage) external onlyOwner {
        if (feePercentage > 10000) revert InvalidFeePercentage(); // Max 100%
        hookTransactionFeePercentage = feePercentage;
        emit IFeeManager.HookTransactionFeeUpdated(feePercentage);
    }

    /// @notice Gets the current channel creation fee
    function getChannelCreationFee() external view returns (uint256) {
        return channelCreationFee;
    }

    /// @notice Gets the current hook registration fee
    function getHookRegistrationFee() external view returns (uint256) {
        return hookRegistrationFee;
    }

    /// @notice Gets the current hook transaction fee percentage
    function getHookTransactionFee() external view returns (uint16) {
        return hookTransactionFeePercentage;
    }

    /// @notice Withdraws accumulated fees to a specified address (only owner)
    /// @param recipient The address to receive the fees
    /// @return amount The amount withdrawn
    function withdrawFees(address recipient) external onlyOwner returns (uint256 amount) {
        amount = accumulatedFees;
        accumulatedFees = 0;
        
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Fee withdrawal failed");
        
        emit IFeeManager.FeesWithdrawn(recipient, amount);
        return amount;
    }

    /// @notice Registers a new hook in the global registry
    /// @param hook The address of the hook to register
    function registerHook(address hook) external payable {
        if (msg.value < hookRegistrationFee) revert InsufficientFee();
        
        if (hook == address(0)) revert InvalidHookAddress();
        
        // Validate that the hook implements IHook interface
        if (!IERC165(hook).supportsInterface(type(IHook).interfaceId)) {
            revert InvalidHookInterface();
        }

        registeredHooks[hook] = true;
        // Hooks are disabled by default
        globallyEnabledHooks[hook] = false;

        accumulatedFees += hookRegistrationFee;
        if (msg.value > hookRegistrationFee) {
            // Refund excess payment
            (bool success, ) = msg.sender.call{value: msg.value - hookRegistrationFee}("");
            require(success, "Refund failed");
        }

        emit HookRegistered(hook);
        emit HookGlobalStatusUpdated(hook, false);
    }

    /// @notice Enables or disables a hook globally (only owner)
    /// @param hook The address of the hook
    /// @param enabled Whether to enable or disable the hook
    function setHookGloballyEnabled(address hook, bool enabled) external onlyOwner {
        if (!registeredHooks[hook]) revert HookNotRegistered();
        
        globallyEnabledHooks[hook] = enabled;
        emit HookGlobalStatusUpdated(hook, enabled);
    }

    /// @notice Checks if a hook is registered and globally enabled
    /// @param hook The address of the hook
    /// @return registered Whether the hook is registered
    /// @return enabled Whether the hook is globally enabled
    function getHookStatus(address hook) external view returns (bool registered, bool enabled) {
        return (registeredHooks[hook], globallyEnabledHooks[hook]);
    }

    /// @notice Internal function to check if a channel exists
    /// @param channelId The channel ID to check
    /// @return bool Whether the channel exists
    function _channelExists(uint256 channelId) internal view virtual returns (bool) {
        return _ownerOf(channelId) != address(0);
    }

    /// @notice Creates a new channel as an NFT
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
    ) external payable returns (uint256 channelId) {
        if (msg.value < channelCreationFee) revert InsufficientFee();

        channelId = _nextTokenId++;
        _safeMint(msg.sender, channelId);

        channels[channelId].name = name;
        channels[channelId].description = description;
        channels[channelId].metadata = metadata;
        channels[channelId].owner = msg.sender;
        channels[channelId].isPrivate = isPrivate;
        channels[channelId].isArchived = false;

        accumulatedFees += channelCreationFee;
        if (msg.value > channelCreationFee) {
            // Refund excess payment
            (bool success, ) = msg.sender.call{value: msg.value - channelCreationFee}("");
            require(success, "Refund failed");
        }

        // Add hooks if provided
        if (hooks.length > 0) {
            require(hooks.length == 1, "Only one hook allowed");
            address hook = hooks[0];
            if (hook == address(0)) revert InvalidHookAddress();
            
            // Validate that the hook implements IHook interface
            if (!IERC165(hook).supportsInterface(type(IHook).interfaceId)) {
                revert InvalidHookInterface();
            }

            channels[channelId].hooks.push(IHook(hook));
            channels[channelId].hookEnabled[hook] = true;

            emit HookAdded(channelId, hook);
            emit HookStatusUpdated(channelId, hook, true);
        }

        return channelId;
    }

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
    ) external {
        if (!_channelExists(channelId)) revert ChannelDoesNotExist();
        if (ownerOf(channelId) != msg.sender) revert NotChannelOwner();

        channels[channelId].name = name;
        channels[channelId].description = description;
        channels[channelId].metadata = metadata;
        channels[channelId].isPrivate = isPrivate;
        channels[channelId].isArchived = isArchived;
        channels[channelId].owner = msg.sender; // Update owner to current NFT owner

        emit ChannelUpdated(channelId, name, description, metadata, isPrivate, isArchived);
    }

    /// @notice Adds a hook to a channel
    /// @param channelId The unique identifier of the channel
    /// @param hook The address of the hook contract
    function addHook(uint256 channelId, address hook) external {
        if (!_channelExists(channelId)) revert ChannelDoesNotExist();
        if (ownerOf(channelId) != msg.sender) revert NotChannelOwner();
        if (hook == address(0)) revert InvalidHookAddress();
        if (!registeredHooks[hook]) revert HookNotRegistered();
        
        // Check if channel already has a hook
        if (channels[channelId].hooks.length > 0) {
            revert ChannelAlreadyHasHook();
        }

        channels[channelId].hooks.push(IHook(hook));
        channels[channelId].hookEnabled[hook] = true;

        emit HookAdded(channelId, hook);
        emit HookStatusUpdated(channelId, hook, true);
    }

    /// @notice Removes a hook from a channel
    /// @param channelId The unique identifier of the channel
    /// @param hook The address of the hook contract
    function removeHook(uint256 channelId, address hook) external {
        if (!_channelExists(channelId)) revert ChannelDoesNotExist();
        if (ownerOf(channelId) != msg.sender) revert NotChannelOwner();

        // Check if the hook exists and is the only hook
        if (channels[channelId].hooks.length != 1 || address(channels[channelId].hooks[0]) != hook) {
            revert HookNotFound();
        }

        delete channels[channelId].hooks[0];
        channels[channelId].hooks.pop();
        channels[channelId].hookEnabled[hook] = false;

        emit HookRemoved(channelId, hook);
    }

    /// @notice Updates a hook's enabled status
    /// @param channelId The unique identifier of the channel
    /// @param hook The address of the hook contract
    /// @param enabled Whether the hook should be enabled
    function setHookEnabled(uint256 channelId, address hook, bool enabled) external {
        if (!_channelExists(channelId)) revert ChannelDoesNotExist();
        if (ownerOf(channelId) != msg.sender) revert NotChannelOwner();

        // Check if the hook exists and is the only hook
        if (channels[channelId].hooks.length != 1 || address(channels[channelId].hooks[0]) != hook) {
            revert HookNotFound();
        }

        channels[channelId].hookEnabled[hook] = enabled;
        emit HookStatusUpdated(channelId, hook, enabled);
    }

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
    ) {
        if (!_channelExists(channelId)) revert ChannelDoesNotExist();

        ChannelConfig storage channel = channels[channelId];
        address[] memory hooksArray = new address[](channel.hooks.length);
        for (uint i = 0; i < channel.hooks.length; i++) {
            hooksArray[i] = address(channel.hooks[i]);
        }
        
        return (
            channel.name,
            channel.description,
            channel.metadata,
            ownerOf(channelId), // Use NFT owner
            channel.isPrivate,
            channel.isArchived,
            hooksArray
        );
    }

    /// @notice Checks if a hook is enabled for a channel
    /// @param channelId The unique identifier of the channel
    /// @param hook The address of the hook contract
    /// @return enabled Whether the hook is enabled
    function isHookEnabled(uint256 channelId, address hook) external view returns (bool enabled) {
        if (!_channelExists(channelId)) revert ChannelDoesNotExist();
        return channels[channelId].hookEnabled[hook];
    }

    /// @notice Public function to execute hook for a channel
    /// @param channelId The unique identifier of the channel
    /// @param commentData The comment data to process
    /// @param caller The address that initiated the transaction
    /// @param commentId The unique identifier of the comment
    /// @param isBeforeHook Whether this is a before or after hook execution
    /// @return success Whether the hook execution was successful
    function executeHooks(
        uint256 channelId,
        ICommentTypes.CommentData memory commentData,
        address caller,
        bytes32 commentId,
        bool isBeforeHook
    ) public payable onlyCommentsContract returns (bool success) {
        if (!_channelExists(channelId)) revert ChannelDoesNotExist();

        ChannelConfig storage channel = channels[channelId];
        if (channel.hooks.length == 0) {
            return true;
        }

        IHook hook = channel.hooks[0];
        address hookAddress = address(hook);
        
        // Check both global and channel-specific enablement
        if (!registeredHooks[hookAddress]) revert HookNotRegistered();
        if (!globallyEnabledHooks[hookAddress]) revert HookDisabledGlobally();
        if (!channel.hookEnabled[hookAddress]) {
            return true; // Skip execution if hook is disabled at channel level
        }

        // Calculate and deduct protocol fee if there's a payment
        uint256 protocolFee = 0;
        uint256 hookValue = msg.value;
        if (msg.value > 0 && hookTransactionFeePercentage > 0) {
            protocolFee = (msg.value * hookTransactionFeePercentage) / 10000;
            hookValue = msg.value - protocolFee;
            accumulatedFees += protocolFee;
        }

        // Execute the appropriate hook function
        if (isBeforeHook) {
            success = hook.beforeComment{value: hookValue}(commentData, caller, commentId);
        } else {
            success = hook.afterComment(commentData, caller, commentId);
        }

        return success;
    }

    /// @notice Check if a channel exists
    /// @param channelId The channel ID to check
    /// @return bool Whether the channel exists
    function channelExists(uint256 channelId) external view returns (bool) {
        return _channelExists(channelId);
    }

    /// @notice Fallback function to receive ETH
    receive() external payable {
        accumulatedFees += msg.value;
    }

    /// @notice Updates the comments contract address (only owner)
    /// @param _commentsContract The new comments contract address
    function updateCommentsContract(address _commentsContract) external onlyOwner {
        commentsContract = _commentsContract;
    }
} 