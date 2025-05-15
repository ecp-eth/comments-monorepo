// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {CommentManager} from "../src/CommentManager.sol";
import {Comments} from "../src/libraries/Comments.sol";
import {ChannelManager} from "../src/ChannelManager.sol";
import {ICommentManager} from "../src/interfaces/ICommentManager.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {TestUtils} from "./utils.sol";
import {BaseHook} from "../src/hooks/BaseHook.sol";
import {Hooks} from "../src/libraries/Hooks.sol";

contract NoHook is BaseHook {
    function getHookPermissions()
        external
        pure
        override
        returns (Hooks.Permissions memory)
    {
        return
            Hooks.Permissions({
                beforeInitialize: false,
                afterInitialize: false,
                beforeComment: false,
                afterComment: false,
                beforeDeleteComment: false,
                afterDeleteComment: false
            });
    }
}

contract CommentsTest is Test, IERC721Receiver {
    event CommentAdded(
        bytes32 indexed commentId,
        address indexed author,
        address indexed app,
        Comments.CommentData commentData
    );
    event CommentDeleted(bytes32 indexed commentId, address indexed author);
    event ApprovalAdded(address indexed approver, address indexed approved);
    event ApprovalRemoved(address indexed approver, address indexed approved);

    CommentManager public comments;
    NoHook public noHook;
    ChannelManager public channelManager;

    // Test accounts
    address public owner;
    address public author;
    address public app;
    uint256 public authorPrivateKey = 0x1;
    uint256 public appPrivateKey = 0x2;
    uint256 public wrongPrivateKey = 0x3;

    function setUp() public {
        owner = address(this);
        author = vm.addr(authorPrivateKey);
        app = vm.addr(appPrivateKey);

        noHook = new NoHook();

        (comments, channelManager) = TestUtils.createContracts(owner);

        // Setup private keys for signing
        vm.deal(author, 100 ether);
        vm.deal(app, 100 ether);
    }

    function _createBasicCreateCommentData()
        internal
        view
        returns (Comments.CreateCommentData memory)
    {
        uint256 nonce = comments.nonces(author, app);

        return
            Comments.CreateCommentData({
                content: "Test comment",
                metadata: "{}",
                targetUri: "",
                commentType: "comment",
                author: author,
                app: app,
                channelId: 0,
                nonce: nonce,
                deadline: block.timestamp + 1 days,
                parentId: bytes32(0)
            });
    }

    function test_PostCommentAsAuthor() public {
        Comments.CreateCommentData
            memory commentData = _createBasicCreateCommentData();
        commentData.app = app;

        // Generate app signature
        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory appSignature = _signEIP712(appPrivateKey, commentId);

        // Send transaction as author
        vm.prank(author);
        comments.postCommentAsAuthor(commentData, appSignature);
    }

    function test_PostCommentAsAuthor_InvalidAuthor() public {
        Comments.CreateCommentData
            memory commentData = _createBasicCreateCommentData();
        commentData.app = app;

        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory appSignature = _signEIP712(appPrivateKey, commentId);

        // Send transaction from wrong address
        address wrongAuthor = address(0x3);
        vm.prank(wrongAuthor);
        vm.expectRevert(
            abi.encodeWithSelector(
                ICommentManager.NotAuthorized.selector,
                wrongAuthor,
                author
            )
        );
        comments.postCommentAsAuthor(commentData, appSignature);
    }

    function test_PostCommentAsAuthor_InvalidAppSignature() public {
        Comments.CreateCommentData
            memory commentData = _createBasicCreateCommentData();
        commentData.app = app;

        // Send transaction as author
        vm.prank(author);
        vm.expectRevert(ICommentManager.InvalidAppSignature.selector);
        comments.postCommentAsAuthor(commentData, "");
    }

    function test_PostComment() public {
        Comments.CreateCommentData
            memory commentData = _createBasicCreateCommentData();
        commentData.app = app;

        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory authorSignature = _signEIP712(authorPrivateKey, commentId);
        bytes memory appSignature = _signEIP712(appPrivateKey, commentId);

        comments.postComment(commentData, authorSignature, appSignature);
    }

    function test_PostComment_InvalidAppSignature() public {
        Comments.CreateCommentData
            memory commentData = _createBasicCreateCommentData();
        commentData.app = app;

        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory authorSignature = _signEIP712(authorPrivateKey, commentId);
        bytes memory wrongSignature = _signEIP712(0x3, commentId); // Wrong private key

        vm.expectRevert(ICommentManager.InvalidAppSignature.selector);
        comments.postComment(commentData, authorSignature, wrongSignature);
    }

    function test_DeleteCommentAsAuthor() public {
        // Create and post a comment first
        Comments.CreateCommentData
            memory commentData = _createBasicCreateCommentData();
        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory appSignature = _signEIP712(appPrivateKey, commentId);

        vm.prank(author);
        comments.postCommentAsAuthor(commentData, appSignature);

        // Delete the comment as author
        vm.prank(author);
        vm.expectEmit(true, true, true, true);
        emit CommentDeleted(commentId, author);
        comments.deleteCommentAsAuthor(commentId);

        // Verify comment is deleted
        vm.expectRevert("Comment does not exist");
        comments.getComment(commentId);
    }

    function test_DeleteComment() public {
        // Create and post a comment first
        Comments.CreateCommentData
            memory commentData = _createBasicCreateCommentData();
        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory authorSignature = _signEIP712(authorPrivateKey, commentId);
        bytes memory appSignature = _signEIP712(appPrivateKey, commentId);

        comments.postComment(commentData, authorSignature, appSignature);

        // Delete the comment with signature
        bytes32 deleteHash = comments.getDeleteCommentHash(
            commentId,
            author,
            app,
            comments.nonces(author, app),
            block.timestamp + 1 days
        );
        bytes memory authorDeleteSignature = _signEIP712(
            authorPrivateKey,
            deleteHash
        );

        vm.expectEmit(true, true, true, true);
        emit CommentDeleted(commentId, author);
        comments.deleteComment(
            commentId,
            author,
            app,
            comments.nonces(author, app),
            block.timestamp + 1 days,
            authorDeleteSignature,
            ""
        );
    }

    function test_DeleteComment_InvalidSignature() public {
        // First create a comment
        Comments.CreateCommentData
            memory commentData = _createBasicCreateCommentData();
        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory appSignature = _signEIP712(appPrivateKey, commentId);

        vm.prank(author);
        comments.postCommentAsAuthor(commentData, appSignature);

        // Try to delete with wrong signature
        uint256 nonce = comments.nonces(author, app);
        uint256 deadline = block.timestamp + 1 days;
        bytes32 deleteHash = comments.getDeleteCommentHash(
            commentId,
            author,
            app,
            nonce,
            deadline
        );
        bytes memory wrongSignature = _signEIP712(wrongPrivateKey, deleteHash); // Wrong signer

        vm.prank(address(0xdead));
        vm.expectRevert(
            abi.encodeWithSelector(
                ICommentManager.NotAuthorized.selector,
                address(0xdead),
                author
            )
        );
        comments.deleteComment(
            commentId,
            author,
            app,
            nonce,
            deadline,
            wrongSignature,
            wrongSignature
        );

        // Verify comment still exists
        assertTrue(comments.getComment(commentId).author != address(0));
    }

    function test_PostCommentAsAuthor_InvalidNonce() public {
        Comments.CreateCommentData
            memory commentData = _createBasicCreateCommentData();
        commentData.nonce = commentData.nonce + 1;

        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory appSignature = _signEIP712(appPrivateKey, commentId);

        vm.prank(author);
        vm.expectRevert(
            abi.encodeWithSelector(
                ICommentManager.InvalidNonce.selector,
                author,
                app,
                0,
                1
            )
        );
        comments.postCommentAsAuthor(commentData, appSignature);
    }

    function test_PostComment_InvalidNonce() public {
        Comments.CreateCommentData
            memory commentData = _createBasicCreateCommentData();
        commentData.nonce = commentData.nonce + 1;

        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory authorSignature = _signEIP712(authorPrivateKey, commentId);
        bytes memory appSignature = _signEIP712(appPrivateKey, commentId);

        vm.expectRevert(
            abi.encodeWithSelector(
                ICommentManager.InvalidNonce.selector,
                author,
                app,
                0,
                1
            )
        );
        comments.postComment(commentData, authorSignature, appSignature);
    }

    function test_AddApprovalAsAuthor() public {
        vm.prank(author);
        vm.expectEmit(true, true, true, true);
        emit ApprovalAdded(author, app);
        comments.addApprovalAsAuthor(app);

        assertTrue(comments.isApproved(author, app));
    }

    function test_revokeApprovalAsAuthor() public {
        // First add approval
        vm.prank(author);
        comments.addApprovalAsAuthor(app);

        // Then remove it
        vm.prank(author);
        vm.expectEmit(true, true, true, true);
        emit ApprovalRemoved(author, app);
        comments.revokeApprovalAsAuthor(app);

        assertFalse(comments.isApproved(author, app));
    }

    function test_PostComment_WithApproval() public {
        // First add approval
        vm.prank(author);
        comments.addApprovalAsAuthor(app);

        // Create and post comment
        Comments.CreateCommentData
            memory commentData = _createBasicCreateCommentData();
        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory appSignature = _signEIP712(appPrivateKey, commentId);

        // Post comment from any address since we have approval
        comments.postComment(commentData, bytes(""), appSignature);
    }

    function test_PostComment_WithoutApproval() public {
        Comments.CreateCommentData
            memory commentData = _createBasicCreateCommentData();
        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory appSignature = _signEIP712(appPrivateKey, commentId);

        // Should fail without approval or valid signature
        vm.expectRevert(
            abi.encodeWithSelector(
                ICommentManager.NotAuthorized.selector,
                address(this),
                author
            )
        );
        comments.postComment(commentData, bytes(""), appSignature);
    }

    function test_AddApproval_WithSignature() public {
        uint256 nonce = 0;
        uint256 deadline = block.timestamp + 1 days;

        bytes32 addApprovalHash = comments.getAddApprovalHash(
            author,
            app,
            nonce,
            deadline
        );
        bytes memory signature = _signEIP712(authorPrivateKey, addApprovalHash);

        vm.prank(author);
        vm.expectEmit(true, true, true, true);
        emit ApprovalAdded(author, app);
        comments.addApproval(author, app, nonce, deadline, signature);

        assertTrue(comments.isApproved(author, app));
    }

    function test_revokeApproval_WithSignature() public {
        // First add approval
        vm.prank(author);
        comments.addApprovalAsAuthor(app);

        uint256 nonce = 0;
        uint256 deadline = block.timestamp + 1 days;

        bytes32 removeHash = comments.getRemoveApprovalHash(
            author,
            app,
            nonce,
            deadline
        );
        bytes memory signature = _signEIP712(authorPrivateKey, removeHash);

        vm.prank(author);
        vm.expectEmit(true, true, true, true);
        emit ApprovalRemoved(author, app);
        comments.removeApproval(author, app, nonce, deadline, signature);

        assertFalse(comments.isApproved(author, app));
    }

    function test_AddApproval_InvalidNonce() public {
        uint256 wrongNonce = 1;
        uint256 deadline = block.timestamp + 1 days;

        bytes32 addApprovalHash = comments.getAddApprovalHash(
            author,
            app,
            wrongNonce,
            deadline
        );
        bytes memory signature = _signEIP712(authorPrivateKey, addApprovalHash);

        vm.expectRevert(
            abi.encodeWithSelector(
                ICommentManager.InvalidNonce.selector,
                author,
                app,
                0,
                1
            )
        );
        comments.addApproval(author, app, wrongNonce, deadline, signature);
    }

    function test_revokeApproval_InvalidNonce() public {
        vm.prank(author);
        comments.addApprovalAsAuthor(app);

        uint256 wrongNonce = 1;
        uint256 deadline = block.timestamp + 1 days;

        bytes32 removeApprovalHash = comments.getRemoveApprovalHash(
            author,
            app,
            wrongNonce,
            deadline
        );
        bytes memory signature = _signEIP712(
            authorPrivateKey,
            removeApprovalHash
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                ICommentManager.InvalidNonce.selector,
                author,
                app,
                0,
                1
            )
        );
        comments.removeApproval(author, app, wrongNonce, deadline, signature);
    }

    function test_DeleteComment_InvalidNonce() public {
        Comments.CreateCommentData
            memory commentData = _createBasicCreateCommentData();
        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory appSignature = _signEIP712(appPrivateKey, commentId);

        vm.prank(author);
        comments.postCommentAsAuthor(commentData, appSignature);

        uint256 wrongNonce = 100;
        uint256 deadline = block.timestamp + 1 days;
        bytes32 deleteHash = comments.getDeleteCommentHash(
            commentId,
            author,
            app,
            wrongNonce,
            deadline
        );
        bytes memory authorDeleteSignature = _signEIP712(
            authorPrivateKey,
            deleteHash
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                ICommentManager.InvalidNonce.selector,
                author,
                app,
                1,
                100
            )
        );
        comments.deleteComment(
            commentId,
            author,
            app,
            wrongNonce,
            deadline,
            authorDeleteSignature,
            ""
        );
    }

    function test_DeleteComment_WithApprovedSigner() public {
        // First add approval
        vm.prank(author);
        comments.addApprovalAsAuthor(app);

        // Create and post a comment
        Comments.CreateCommentData
            memory commentData = _createBasicCreateCommentData();
        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory appSignature = _signEIP712(appPrivateKey, commentId);

        vm.prank(author);
        comments.postCommentAsAuthor(commentData, appSignature);

        // Delete the comment with app signature only
        bytes32 deleteHash = comments.getDeleteCommentHash(
            commentId,
            author,
            app,
            comments.nonces(author, app),
            block.timestamp + 1 days
        );
        bytes memory appDeleteSignature = _signEIP712(
            appPrivateKey,
            deleteHash
        );

        vm.expectEmit(true, true, true, true);
        emit CommentDeleted(commentId, author);
        comments.deleteComment(
            commentId,
            author,
            app,
            comments.nonces(author, app),
            block.timestamp + 1 days,
            bytes(""), // Empty author signature
            appDeleteSignature
        );
    }

    function test_PostComment_WithFeeCollection() public {
        uint256 channelId1 = channelManager.createChannel{value: 0.02 ether}(
            "Test Channel",
            "Test Description",
            "{}",
            address(noHook)
        );

        Comments.CreateCommentData
            memory commentData = _createBasicCreateCommentData();
        commentData.channelId = channelId1;
        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory authorSignature = _signEIP712(authorPrivateKey, commentId);
        bytes memory appSignature = _signEIP712(appPrivateKey, commentId);

        // Post comment with fee
        vm.prank(author);
        vm.deal(author, 1 ether);
        comments.postComment{value: 0.1 ether}(
            commentData,
            authorSignature,
            appSignature
        );
    }

    function test_PostComment_WithInvalidFee() public {
        // Setup fee collector that requires 1 ether
        MaliciousFeeCollector maliciousCollector = new MaliciousFeeCollector();

        uint256 channelId2 = channelManager.createChannel{value: 0.02 ether}(
            "Test Channel",
            "Test Description",
            "{}",
            address(maliciousCollector)
        );

        Comments.CreateCommentData
            memory commentData = _createBasicCreateCommentData();
        commentData.channelId = channelId2;
        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory authorSignature = _signEIP712(authorPrivateKey, commentId);
        bytes memory appSignature = _signEIP712(appPrivateKey, commentId);

        // Try to post comment with insufficient fee
        vm.prank(author);
        vm.expectRevert("Malicious revert");
        comments.postComment{value: 0.1 ether}(
            commentData,
            authorSignature,
            appSignature
        );
    }

    function test_PostComment_WithThreading() public {
        // Post parent comment
        Comments.CreateCommentData
            memory parentComment = _createBasicCreateCommentData();
        bytes32 parentId = comments.getCommentId(parentComment);
        bytes memory parentAuthorSig = _signEIP712(authorPrivateKey, parentId);
        bytes memory parentAppSig = _signEIP712(appPrivateKey, parentId);

        comments.postComment(parentComment, parentAuthorSig, parentAppSig);

        // Post reply comment
        Comments.CreateCommentData
            memory replyComment = _createBasicCreateCommentData();
        replyComment.nonce = comments.nonces(author, app); // Update nonce
        replyComment.parentId = parentId; // Set parent ID for reply

        bytes32 replyId = comments.getCommentId(replyComment);
        bytes memory replyAuthorSig = _signEIP712(authorPrivateKey, replyId);
        bytes memory replyAppSig = _signEIP712(appPrivateKey, replyId);

        comments.postComment(replyComment, replyAuthorSig, replyAppSig);

        // Verify thread relationship
        Comments.CommentData memory storedReply = comments.getComment(replyId);
        assertEq(
            storedReply.parentId,
            parentId,
            "Reply should have correct parent ID"
        );
    }

    function test_PostComment_ExpiredDeadline() public {
        Comments.CreateCommentData
            memory commentData = _createBasicCreateCommentData();
        commentData.deadline = block.timestamp - 1; // Expired deadline

        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory authorSignature = _signEIP712(authorPrivateKey, commentId);
        bytes memory appSignature = _signEIP712(appPrivateKey, commentId);

        vm.expectRevert(
            abi.encodeWithSelector(
                ICommentManager.SignatureDeadlineReached.selector,
                commentData.deadline,
                block.timestamp
            )
        );
        comments.postComment(commentData, authorSignature, appSignature);
    }

    function test_DeleteComment_NonExistentComment() public {
        bytes32 nonExistentId = bytes32(uint256(1));

        vm.prank(author);
        vm.expectRevert("Comment does not exist");
        comments.deleteCommentAsAuthor(nonExistentId);
    }

    function test_DeleteComment_NotAuthor() public {
        // First create a comment
        Comments.CreateCommentData
            memory commentData = _createBasicCreateCommentData();
        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory authorSignature = _signEIP712(authorPrivateKey, commentId);
        bytes memory appSignature = _signEIP712(appPrivateKey, commentId);

        comments.postComment(commentData, authorSignature, appSignature);

        // Try to delete as non-author
        address nonAuthor = address(0x4);
        vm.prank(nonAuthor);
        vm.expectRevert("Not comment author");
        comments.deleteCommentAsAuthor(commentId);
    }

    function test_ApprovalLifecycle() public {
        // Add approval
        vm.prank(author);
        comments.addApprovalAsAuthor(app);
        assertTrue(comments.isApproved(author, app));

        // Post comment without author signature (using approval)
        Comments.CreateCommentData
            memory commentData = _createBasicCreateCommentData();
        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory appSignature = _signEIP712(appPrivateKey, commentId);

        comments.postComment(commentData, bytes(""), appSignature);

        // Remove approval
        vm.prank(author);
        comments.revokeApprovalAsAuthor(app);
        assertFalse(comments.isApproved(author, app));

        // Try to post again without approval (should fail)
        commentData.nonce = comments.nonces(author, app);
        commentId = comments.getCommentId(commentData);
        appSignature = _signEIP712(appPrivateKey, commentId);

        vm.expectRevert(
            abi.encodeWithSelector(
                ICommentManager.NotAuthorized.selector,
                address(this),
                author
            )
        );
        comments.postComment(commentData, bytes(""), appSignature);
    }

    function test_NonceIncrement() public {
        uint256 initialNonce = comments.nonces(author, app);

        // Post comment
        Comments.CreateCommentData
            memory commentData = _createBasicCreateCommentData();
        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory authorSignature = _signEIP712(authorPrivateKey, commentId);
        bytes memory appSignature = _signEIP712(appPrivateKey, commentId);

        comments.postComment(commentData, authorSignature, appSignature);

        assertEq(comments.nonces(author, app), initialNonce + 1);

        // Try to reuse the same nonce
        vm.expectRevert(
            abi.encodeWithSelector(
                ICommentManager.InvalidNonce.selector,
                author,
                app,
                initialNonce + 1,
                initialNonce
            )
        );
        comments.postComment(commentData, authorSignature, appSignature);
    }

    function test_PostComment_ReplyToDeletedComment() public {
        // Post parent comment
        Comments.CreateCommentData
            memory parentComment = _createBasicCreateCommentData();
        bytes32 parentId = comments.getCommentId(parentComment);
        bytes memory parentAuthorSig = _signEIP712(authorPrivateKey, parentId);
        bytes memory parentAppSig = _signEIP712(appPrivateKey, parentId);

        comments.postComment(parentComment, parentAuthorSig, parentAppSig);

        // Delete the parent comment
        vm.prank(author);
        comments.deleteCommentAsAuthor(parentId);

        // Post reply to deleted comment
        Comments.CreateCommentData
            memory replyComment = _createBasicCreateCommentData();
        replyComment.nonce = comments.nonces(author, app); // Update nonce
        replyComment.parentId = parentId; // Set parent ID for reply

        bytes32 replyId = comments.getCommentId(replyComment);
        bytes memory replyAuthorSig = _signEIP712(authorPrivateKey, replyId);
        bytes memory replyAppSig = _signEIP712(appPrivateKey, replyId);

        // This should succeed even though parent is deleted
        comments.postComment(replyComment, replyAuthorSig, replyAppSig);

        // Verify reply was created with correct parent ID
        Comments.CommentData memory storedReply = comments.getComment(replyId);
        assertEq(
            storedReply.parentId,
            parentId,
            "Reply should have correct parent ID"
        );
    }

    function test_PostComment_CannotHaveBothParentIdAndTargetUri() public {
        // First create a parent comment
        Comments.CreateCommentData
            memory parentComment = _createBasicCreateCommentData();
        bytes32 parentId = comments.getCommentId(parentComment);
        bytes memory parentAuthorSig = _signEIP712(authorPrivateKey, parentId);
        bytes memory parentAppSig = _signEIP712(appPrivateKey, parentId);
        comments.postComment(parentComment, parentAuthorSig, parentAppSig);

        // Create a comment with both parentId and targetUri set
        Comments.CreateCommentData
            memory commentData = _createBasicCreateCommentData();
        commentData.parentId = parentId; // Set the parent ID to the existing comment
        commentData.targetUri = "https://example.com"; // Set a non-empty targetUri in lowercase

        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory authorSignature = _signEIP712(authorPrivateKey, commentId);
        bytes memory appSignature = _signEIP712(appPrivateKey, commentId);

        // Expect revert when trying to post comment with both parentId and targetUri
        vm.expectRevert(
            abi.encodeWithSelector(
                ICommentManager.InvalidCommentReference.selector,
                "Parent comment and targetUri cannot both be set"
            )
        );
        comments.postComment(commentData, authorSignature, appSignature);
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    // Helper function to sign EIP-712 messages
    function _signEIP712(
        uint256 privateKey,
        bytes32 digest
    ) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        return abi.encodePacked(r, s, v);
    }
}

// Mock malicious fee collector that reverts on collection
contract MaliciousFeeCollector is BaseHook {
    function _beforeComment(
        Comments.CommentData calldata,
        address,
        bytes32
    ) internal pure override returns (bool) {
        revert("Malicious revert");
    }

    function _getHookPermissions()
        internal
        pure
        override
        returns (Hooks.Permissions memory)
    {
        return
            Hooks.Permissions({
                beforeComment: true,
                afterComment: false,
                beforeDeleteComment: false,
                afterDeleteComment: false,
                beforeInitialize: false,
                afterInitialize: false
            });
    }
}
