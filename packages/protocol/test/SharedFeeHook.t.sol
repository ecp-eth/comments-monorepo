// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/interfaces/IHook.sol";
import "../src/interfaces/ICommentTypes.sol";
import "../src/interfaces/IChannelManager.sol";
import "../src/CommentsV1.sol";
import "../src/ChannelManager.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "forge-std/console.sol";

/// @title SharedFeeHook - A hook that splits comment fees between channel owners and parent comment authors
/// @notice This hook charges 0.001 ETH per comment and splits it between channel owners and parent comment authors
contract SharedFeeHook is IHook, ReentrancyGuard {
    using Strings for string;

    uint256 public constant COMMENT_FEE = 0.001 ether;
    uint256 public constant PROTOCOL_FEE_PERCENTAGE = 1000; // 10%
    uint256 public constant HOOK_FEE = 900000000000000; // 0.0009 ether (after 10% protocol fee)
    uint256 public constant TOTAL_FEE_WITH_PROTOCOL = 0.001 ether; // Total fee including protocol fee

    IChannelManager public immutable channelManager;
    CommentsV1 public immutable comments;
    
    mapping(address => uint256) public pendingWithdrawals;

    event FeeDistributed(
        bytes32 indexed commentId,
        address indexed channelOwner,
        uint256 channelOwnerShare,
        address parentAuthor,
        uint256 parentAuthorShare,
        address parentAppSigner,
        uint256 parentAppSignerShare,
        address appSigner,
        uint256 appSignerShare
    );
    event FeesWithdrawn(address indexed user, uint256 amount);

    constructor(address _channelManager, address _comments) {
        channelManager = IChannelManager(_channelManager);
        comments = CommentsV1(_comments);
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IHook).interfaceId;
    }

    /// @notice Called before a comment is posted to verify and collect the fee
    function beforeComment(
        ICommentTypes.CommentData calldata,
        address,
        bytes32
    ) external payable override returns (bool) {
        require(msg.value >= HOOK_FEE, "Insufficient fee");
        return true;
    }

    /// @notice Called after a comment is posted to distribute the fee
    function afterComment(
        ICommentTypes.CommentData calldata commentData,
        address,
        bytes32 commentId
    ) external override returns (bool success) {

        // Parse target URI to determine if this is a reply
        (bool isReply, address parentAuthor, address parentAppSigner) = parseTargetUri(commentData.targetUri);

        // Get channel owner
        address channelOwner = channelManager.getChannelOwner(commentData.channelId);

        if (isReply) {
            _distributeReplyFees(commentId, channelOwner, parentAuthor, parentAppSigner, commentData.appSigner);
        } else {
            _distributeTopLevelFees(commentId, channelOwner, commentData.appSigner);
        }

        return true;
    }

    /// @notice Distribute fees for a reply comment
    function _distributeReplyFees(
        bytes32 commentId,
        address channelOwner,
        address parentAuthor,
        address parentAppSigner,
        address appSigner
    ) internal {
        uint256 quarterShare = HOOK_FEE / 4;
        
        pendingWithdrawals[channelOwner] += quarterShare;
        pendingWithdrawals[parentAuthor] += quarterShare;
        pendingWithdrawals[parentAppSigner] += quarterShare;
        pendingWithdrawals[appSigner] += quarterShare;

        emit FeeDistributed(
            commentId,
            channelOwner,
            quarterShare,
            parentAuthor,
            quarterShare,
            parentAppSigner,
            quarterShare,
            appSigner,
            quarterShare
        );
    }

    /// @notice Distribute fees for a top-level comment
    function _distributeTopLevelFees(
        bytes32 commentId,
        address channelOwner,
        address appSigner
    ) internal {
        uint256 channelOwnerShare = (HOOK_FEE * 50) / 100;
        uint256 appSignerShare = HOOK_FEE - channelOwnerShare;

        pendingWithdrawals[channelOwner] += channelOwnerShare;
        pendingWithdrawals[appSigner] += appSignerShare;

        emit FeeDistributed(
            commentId,
            channelOwner,
            channelOwnerShare,
            address(0),
            0,
            address(0),
            0,
            appSigner,
            appSignerShare
        );
    }

    /// @notice Parse CAIP URL and get all parent comment authors and app signers recursively
    /// @param targetUri CAIP URL in format eip155:${chainId}/${contractAddress}/${commentId}
    function getParentAuthorsAndSigners(string memory targetUri) internal view returns (address[] memory authors, address[] memory appSigners) {
        address[] memory authorsTemp = new address[](10); // Max depth of 10
        address[] memory signersTemp = new address[](10); // Max depth of 10
        uint256 count = 0;

        string memory currentUri = targetUri;
        while (bytes(currentUri).length > 0 && count < 10) {
            (bool isReply, address author, address signer) = parseTargetUri(currentUri);
            if (!isReply) break;

            authorsTemp[count] = author;
            signersTemp[count] = signer;
            count++;
            
            // Get the parent comment's targetUri from the comment
            (, , string memory parentUri, , , , , ,) = comments.comments(bytes32(uint256(keccak256(bytes(currentUri)))));
            currentUri = parentUri;
        }

        // Create correctly sized arrays with only valid entries
        authors = new address[](count);
        appSigners = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            authors[i] = authorsTemp[i];
            appSigners[i] = signersTemp[i];
        }
        return (authors, appSigners);
    }

    /// @notice Parse a CAIP URL into commentId and parent URI
    function parseTargetUri(string memory uri) internal view returns (bool isReply, address parentAuthor, address parentAppSigner) {
        // Split the URI into parts
        bytes memory uriBytes = bytes(uri);
        if (uriBytes.length == 0) return (false, address(0), address(0));

        // Find the last '/' to get the commentId
        int256 lastSlash = -1;
        for (uint256 i = 0; i < uriBytes.length; i++) {
            if (uriBytes[i] == "/") {
                lastSlash = int256(i);
            }
        }
        if (lastSlash == -1) return (false, address(0), address(0));

        // Extract the commentId
        string memory commentIdHex = substring(uri, uint256(lastSlash) + 1, uriBytes.length);
        
        bytes32 commentId = bytes32(Strings.parseHexUint(commentIdHex));

        // Get the parent comment's author and app signer
        (, , , , address author, address appSigner, , ,) = comments.comments(commentId);
        return (true, author, appSigner);
    }

    /// @notice Extract substring from string
    function substring(string memory str, uint256 startIndex, uint256 endIndex) internal pure returns (string memory) {
        bytes memory strBytes = bytes(str);
        bytes memory result = new bytes(endIndex - startIndex);
        for (uint256 i = startIndex; i < endIndex; i++) {
            result[i - startIndex] = strBytes[i];
        }
        return string(result);
    }

    /// @notice Withdraw accumulated fees
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No fees to withdraw");
        
        pendingWithdrawals[msg.sender] = 0;
        (bool success,) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        emit FeesWithdrawn(msg.sender, amount);
    }

    /// @notice Allow contract to receive ETH
    receive() external payable {}
}

contract SharedFeeHookTest is Test, IERC721Receiver {
    using Strings for string;

    CommentsV1 public comments;
    ChannelManager public channelManager;
    SharedFeeHook public hook;
    bytes32 public channelId;
    address public owner;

    address public channelOwner = address(0x1);
    address public commenter1 = address(0x2);
    address public commenter2 = address(0x3);
    address public commenter3 = address(0x4);
    address public appSigner1 = address(0x5);
    address public appSigner2 = address(0x6);
    uint256 public initialBalance;
    uint256 constant SIGNER_PK = 0x123;
    uint256 constant COMMENTER1_PK = 0x456;
    uint256 constant COMMENTER2_PK = 0x789;
    uint256 constant COMMENTER3_PK = 0xabc;
    uint256 constant COMMENT_FEE = 0.001 ether;
    uint256 constant PROTOCOL_FEE_PERCENTAGE = 1000; // 10%
    uint256 constant HOOK_FEE = 900000000000000; // 0.0009 ether (after 10% protocol fee)
    uint256 constant TOTAL_FEE_WITH_PROTOCOL = 0.001 ether; // Total fee including protocol fee

    event CommentAdded(
        bytes32 indexed commentId,
        address indexed author,
        address indexed appSigner,
        ICommentTypes.CommentData commentData
    );

    function _deployContracts() internal {
        comments = new CommentsV1(address(0)); // First deploy with zero address
        channelManager = new ChannelManager(address(this), address(comments));
        comments = new CommentsV1(address(channelManager)); // Redeploy with correct address
        channelManager.updateCommentsContract(address(comments)); // Update the comments contract address
        hook = new SharedFeeHook(address(channelManager), address(comments));
    }

    function _setupChannel() internal {
        vm.prank(channelOwner);
        vm.deal(channelOwner, 1 ether);
        uint256 channelIdUint = channelManager.createChannel{value: 0.02 ether}(
            "test-channel",
            "Test Channel",
            "",
            address(0)
        );
        channelId = bytes32(channelIdUint);
        channelManager.registerHook{value: 0.02 ether}(address(hook));
        channelManager.setHookGloballyEnabled(address(hook), true);
        vm.prank(channelOwner);
        channelManager.setHook(uint256(channelId), address(hook));
    }

    /// @notice Extract substring from string
    function substring(string memory str, uint256 startIndex, uint256 endIndex) internal pure returns (string memory) {
        bytes memory strBytes = bytes(str);
        bytes memory result = new bytes(endIndex - startIndex);
        for (uint256 i = startIndex; i < endIndex; i++) {
            result[i - startIndex] = strBytes[i];
        }
        return string(result);
    }

    function _createCommentData(
        address commenter,
        bytes32 parentId,
        address appSigner
    ) internal view returns (ICommentTypes.CommentData memory) {
        // Convert parentId to hex string without 0x prefix
        string memory parentIdHex = parentId == bytes32(0) ? "" : toHexString(uint256(parentId));
        // Remove 0x prefix if present
        if (bytes(parentIdHex).length > 0 && bytes(parentIdHex)[0] == 0x30 && bytes(parentIdHex)[1] == 0x78) {
            parentIdHex = substring(parentIdHex, 2, bytes(parentIdHex).length);
        }
        string memory targetUri = parentId == bytes32(0) ? "" : string(abi.encodePacked("eip155:1/", toHexString(uint256(uint160(address(comments)))), "/", parentIdHex));
        return ICommentTypes.CommentData({
            content: "Test comment",
            metadata: "{}",
            targetUri: targetUri,
            commentType: "comment",
            author: commenter,
            appSigner: appSigner,
            channelId: uint256(channelId),
            nonce: comments.nonces(commenter, appSigner),
            deadline: block.timestamp + 1 days
        });
    }

    function toHexString(uint256 value) internal pure returns (string memory) {
        bytes memory buffer = new bytes(64); // Fixed length for bytes32
        for (uint256 i = 0; i < 64; i++) {
            uint8 digit = uint8(value & 0xf);
            if (digit < 10) {
                buffer[63 - i] = bytes1(uint8(48 + digit));
            } else {
                buffer[63 - i] = bytes1(uint8(87 + digit));
            }
            value = value >> 4;
        }
        return string(buffer);
    }

    function toHexString(address addr) internal pure returns (string memory) {
        return toHexString(uint256(uint160(addr)));
    }

    function toHexString(bytes32 value) internal pure returns (string memory) {
        return toHexString(uint256(value));
    }

    function _generateApprovalSignature(
        address commenter,
        uint256
    ) internal view returns (bytes memory) {
        bytes32 hash = comments.getAddApprovalHash(
            commenter,
            address(this),
            comments.nonces(commenter, address(this)),
            block.timestamp + 1 days
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_PK, hash);
        return abi.encodePacked(r, s, v);
    }

    function setUp() public {
        owner = address(this);

        _deployContracts();
        _setupChannel();

        // Set up initial balances
        vm.deal(commenter1, 1 ether);
        vm.deal(commenter2, 1 ether);
        vm.deal(commenter3, 1 ether);

        // Add approvals for all commenters with both app signers
        vm.prank(commenter1);
        comments.addApprovalAsAuthor(appSigner1);
        vm.prank(commenter1);
        comments.addApprovalAsAuthor(appSigner2);

        vm.prank(commenter2);
        comments.addApprovalAsAuthor(appSigner1);
        vm.prank(commenter2);
        comments.addApprovalAsAuthor(appSigner2);

        vm.prank(commenter3);
        comments.addApprovalAsAuthor(appSigner1);
        vm.prank(commenter3);
        comments.addApprovalAsAuthor(appSigner2);
    }

    function testTopLevelComment() public {
        // Set up test data
        ICommentTypes.CommentData memory commentData = _createCommentData(commenter1, bytes32(0), appSigner1);
        
        // Set initial balance
        initialBalance = address(hook).balance;

        // Make comment with total fee (including protocol fee)
        vm.prank(commenter1);
        comments.postCommentAsAuthor{value: TOTAL_FEE_WITH_PROTOCOL}(commentData, "");

        // Verify comment was added and hook received the fee after protocol fee deduction
        assertEq(address(hook).balance, initialBalance + HOOK_FEE);

        // Verify fee distribution: 50% to channel owner, 50% to app signers
        uint256 channelOwnerShare = (HOOK_FEE * 50) / 100;
        uint256 appSignerShare = HOOK_FEE - channelOwnerShare;
        
        assertEq(hook.pendingWithdrawals(channelOwner), channelOwnerShare);
        assertEq(hook.pendingWithdrawals(appSigner1), appSignerShare);
        assertEq(hook.pendingWithdrawals(appSigner2), 0);
    }

    function testInsufficientFee() public {
        // Set up test data
        ICommentTypes.CommentData memory commentData = _createCommentData(commenter1, bytes32(0), appSigner1);
        
        // Make comment with insufficient fee
        vm.prank(commenter1);
        vm.expectRevert("Insufficient fee");
        comments.postCommentAsAuthor{value: 0.0005 ether}(commentData, "");
    }

    function testReplyComment() public {
        // First create a parent comment
        ICommentTypes.CommentData memory parentData = _createCommentData(commenter1, bytes32(0), appSigner1);
        
        vm.prank(commenter1);
        bytes32 parentId = comments.getCommentId(parentData);
        comments.postCommentAsAuthor{value: TOTAL_FEE_WITH_PROTOCOL}(parentData, "");

        // Now create a reply
        ICommentTypes.CommentData memory replyData = _createCommentData(commenter2, parentId, appSigner2);
        

        initialBalance = address(hook).balance;

        // Post reply with total fee (including protocol fee)
        vm.prank(commenter2);
        comments.postCommentAsAuthor{value: TOTAL_FEE_WITH_PROTOCOL}(replyData, "");

        // Debug log the hook balance and fee amount
        console.log("Hook balance after reply:", address(hook).balance);
        console.log("Hook fee amount:", HOOK_FEE);

        // Verify fee distribution after protocol fee deduction
        assertEq(address(hook).balance, initialBalance + HOOK_FEE);

        // Calculate expected shares (25% each)
        uint256 quarterShare = HOOK_FEE / 4;
        
        // Debug log the balances
        console.log("Channel owner balance:", hook.pendingWithdrawals(channelOwner));
        console.log("Parent author balance:", hook.pendingWithdrawals(commenter1));
        console.log("Parent app signer balance:", hook.pendingWithdrawals(appSigner1));
        console.log("Current app signer balance:", hook.pendingWithdrawals(appSigner2));
        
        // Verify distribution:
        // Channel owner: 50% of fee for top level comment plus 25% for reply
        // Commenter1: 25% from reply to their comment
        // AppSigner1: 50% of fee for top leve comment, plus 25% for reply
        // - 25% to current app signer for a reply (appSigner2)
        assertEq(hook.pendingWithdrawals(channelOwner), 3 * quarterShare);
        assertEq(hook.pendingWithdrawals(commenter1), quarterShare);
        assertEq(hook.pendingWithdrawals(appSigner1), 3 * quarterShare);
        assertEq(hook.pendingWithdrawals(appSigner2), quarterShare);
    }

    // Add IERC721Receiver implementation at the end of the contract
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
} 