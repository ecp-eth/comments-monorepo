// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {ChannelManager} from "../src/ChannelManager.sol";
import {CommentsV1} from "../src/CommentsV1.sol";
import {IHook} from "../src/interfaces/IHook.sol";
import {ICommentTypes} from "../src/interfaces/ICommentTypes.sol";
import {IChannelManager} from "../src/interfaces/IChannelManager.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {TestUtils} from "./utils.sol";

// Token contract for testing
contract TestToken is ERC20 {
    constructor() ERC20("Test Token", "TEST") {
        _mint(msg.sender, 1000000 * 10**18); // Mint 1M tokens to deployer
    }
}

// Token gating hook contract
contract TokenGatedHook is IHook {
    ERC20 public token;
    uint256 public requiredBalance;

    constructor(address _token, uint256 _requiredBalance) {
        token = ERC20(_token);
        requiredBalance = _requiredBalance;
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IHook).interfaceId;
    }

    function beforeComment(
        ICommentTypes.CommentData calldata commentData,
        address,
        bytes32
    ) external payable returns (bool) {
        // Check if the comment author has enough tokens
        uint256 balance = token.balanceOf(commentData.author);
        return balance >= requiredBalance;
    }

    function afterComment(
        ICommentTypes.CommentData calldata,
        address,
        bytes32
    ) external pure returns (bool) {
        return true;
    }
}

contract TokenGatedHookTest is Test, IERC721Receiver {
    using TestUtils for string;
    
    ChannelManager public channelManager;
    TokenGatedHook public tokenGatedHook;
    TestToken public testToken;
    address public commentsContract;

    address public owner;
    address public user1;
    address public user2;

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        // Deploy test token
        testToken = new TestToken();
        
        // Deploy token gated hook with 1000 token requirement
        tokenGatedHook = new TokenGatedHook(address(testToken), 1000 * 10**18);

        // Deploy CommentsV1 first with zero address
        CommentsV1 comments = new CommentsV1(address(0));
        
        // Deploy ChannelManager with CommentsV1 address
        channelManager = new ChannelManager(owner, address(comments));
        
        // Deploy final CommentsV1 with correct address
        comments = new CommentsV1(address(channelManager));
        commentsContract = address(comments);
        channelManager.updateCommentsContract(commentsContract);

        // Register the token gated hook
        channelManager.registerHook{value: 0.02 ether}(address(tokenGatedHook));
        // Enable the hook globally
        channelManager.setHookGloballyEnabled(address(tokenGatedHook), true);

        vm.deal(user1, 100 ether);
        vm.deal(user2, 100 ether);
    }

    function test_TokenGatedHookAllowsCommentWithEnoughTokens() public {
        // Create channel with token gated hook
        uint256 channelId = channelManager.createChannel{value: 0.02 ether}(
            "Token Gated Channel",
            "Must hold 1000 TEST tokens to comment",
            "{}",
            address(tokenGatedHook)
        );

        // Transfer 1000 tokens to user1
        testToken.transfer(user1, 1000 * 10**18);

        // Create comment data using direct construction
        ICommentTypes.CommentData memory commentData = ICommentTypes.CommentData({
            content: "Test comment",
            metadata: "{}",
            targetUri: "",
            commentType: "comment",
            author: user1,
            appSigner: user2,
            channelId: channelId,
            nonce: CommentsV1(commentsContract).nonces(user1, user2),
            deadline: block.timestamp + 1 days
        });

        // Test beforeComment hook - should succeed
        vm.prank(commentsContract);
        assertTrue(channelManager.executeHooks(
            channelId,
            commentData,
            user1,
            bytes32(0),
            IChannelManager.HookPhase.Before
        ));
    }

    function test_TokenGatedHookBlocksCommentWithoutEnoughTokens() public {
        // Create channel with token gated hook
        uint256 channelId = channelManager.createChannel{value: 0.02 ether}(
            "Token Gated Channel",
            "Must hold 1000 TEST tokens to comment",
            "{}",
            address(tokenGatedHook)
        );

        // Transfer only 999 tokens to user1 (not enough)
        testToken.transfer(user1, 999 * 10**18);

        // Create comment data using direct construction
        ICommentTypes.CommentData memory commentData = ICommentTypes.CommentData({
            content: "Test comment",
            metadata: "{}",
            targetUri: "",
            commentType: "comment",
            author: user1,
            appSigner: user2,
            channelId: channelId,
            nonce: CommentsV1(commentsContract).nonces(user1, user2),
            deadline: block.timestamp + 1 days
        });

        // Test beforeComment hook - should fail
        vm.prank(commentsContract);
        vm.expectRevert(IChannelManager.ChannelHookExecutionFailed.selector);
        channelManager.executeHooks(
            channelId,
            commentData,
            user1,
            bytes32(0),
            IChannelManager.HookPhase.Before
        );
    }

    function test_TokenGatedHookAllowsCommentAfterReceivingTokens() public {
        // Create channel with token gated hook
        uint256 channelId = channelManager.createChannel{value: 0.02 ether}(
            "Token Gated Channel",
            "Must hold 1000 TEST tokens to comment",
            "{}",
            address(tokenGatedHook)
        );

        // Create comment data using direct construction
        ICommentTypes.CommentData memory commentData = ICommentTypes.CommentData({
            content: "Test comment",
            metadata: "{}",
            targetUri: "",
            commentType: "comment",
            author: user1,
            appSigner: user2,
            channelId: channelId,
            nonce: CommentsV1(commentsContract).nonces(user1, user2),
            deadline: block.timestamp + 1 days
        });

        // First try without tokens - should fail
        vm.prank(commentsContract);
        vm.expectRevert(IChannelManager.ChannelHookExecutionFailed.selector);
        channelManager.executeHooks(
            channelId,
            commentData,
            user1,
            bytes32(0),
            IChannelManager.HookPhase.Before
        );

        // Transfer 1000 tokens to user1
        testToken.transfer(user1, 1000 * 10**18);

        // Try again with tokens - should succeed
        vm.prank(commentsContract);
        assertTrue(channelManager.executeHooks(
            channelId,
            commentData,
            user1,
            bytes32(0),
            IChannelManager.HookPhase.Before
        ));
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
} 