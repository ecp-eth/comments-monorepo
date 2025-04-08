// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {CommentsV1} from "../src/CommentsV1.sol";
import {NoFeeCollector} from "../src/NoFeeCollector.sol";
import {ICommentTypes} from "../src/interfaces/ICommentTypes.sol";
import {IFeeCollector} from "../src/interfaces/IFeeCollector.sol";

contract CommentsV1Test is Test {
    event CommentAdded(
        bytes32 indexed commentId,
        address indexed author,
        address indexed appSigner,
        ICommentTypes.CommentData commentData
    );
    event CommentDeleted(bytes32 indexed commentId, address indexed author);
    event ApprovalAdded(address indexed approver, address indexed approved);
    event ApprovalRemoved(address indexed approver, address indexed approved);

    CommentsV1 public comments;
    NoFeeCollector public noFeeCollector;

    // Test accounts
    address public owner;
    address public author;
    address public appSigner;
    uint256 public authorPrivateKey = 0x1;
    uint256 public appSignerPrivateKey = 0x2;
    uint256 public wrongPrivateKey = 0x3;

    function setUp() public {
        owner = address(this);
        author = vm.addr(authorPrivateKey);
        appSigner = vm.addr(appSignerPrivateKey);

        comments = new CommentsV1();
        noFeeCollector = new NoFeeCollector();

        // Setup private keys for signing
        vm.deal(author, 100 ether);
        vm.deal(appSigner, 100 ether);
    }

    function _createBasicComment()
        internal
        view
        returns (ICommentTypes.CommentData memory)
    {
        uint256 nonce = comments.nonces(author, appSigner);

        return
            ICommentTypes.CommentData({
                content: "Test comment",
                metadata: "{}",
                targetUri: "https://example.com",
                parentId: bytes32(0),
                threadId: bytes32(0),
                author: author,
                appSigner: appSigner,
                nonce: nonce,
                deadline: block.timestamp + 1 days
            });
    }

    function test_PostCommentAsAuthor() public {
        ICommentTypes.CommentData memory commentData = _createBasicComment();
        commentData.appSigner = appSigner;

        // Generate app signature
        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory appSignature = _signEIP712(appSignerPrivateKey, commentId);

        // Send transaction as author
        vm.prank(author);
        comments.postCommentAsAuthor(commentData, appSignature);
    }

    function test_PostCommentAsAuthor_InvalidAuthor() public {
        ICommentTypes.CommentData memory commentData = _createBasicComment();
        commentData.appSigner = appSigner;

        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory appSignature = _signEIP712(appSignerPrivateKey, commentId);

        // Send transaction from wrong address
        address wrongAuthor = address(0x3);
        vm.prank(wrongAuthor);
        vm.expectRevert(abi.encodeWithSelector(CommentsV1.NotAuthorized.selector, wrongAuthor, author));
        comments.postCommentAsAuthor(commentData, appSignature);
    }

    function test_PostComment() public {
        ICommentTypes.CommentData memory commentData = _createBasicComment();
        commentData.appSigner = appSigner;

        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory authorSignature = _signEIP712(authorPrivateKey, commentId);
        bytes memory appSignature = _signEIP712(appSignerPrivateKey, commentId);

        comments.postComment(commentData, authorSignature, appSignature);
    }

    function test_PostComment_InvalidAppSignature() public {
        ICommentTypes.CommentData memory commentData = _createBasicComment();
        commentData.appSigner = appSigner;

        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory authorSignature = _signEIP712(authorPrivateKey, commentId);
        bytes memory wrongSignature = _signEIP712(0x3, commentId); // Wrong private key

        vm.expectRevert(CommentsV1.InvalidAppSignature.selector);
        comments.postComment(commentData, authorSignature, wrongSignature);
    }

    function test_DeleteCommentAsAuthor() public {
        // Create and post a comment first
        ICommentTypes.CommentData memory commentData = _createBasicComment();
        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory appSignature = _signEIP712(appSignerPrivateKey, commentId);

        vm.prank(author);
        comments.postCommentAsAuthor(commentData, appSignature);

        // Delete the comment as author
        vm.prank(author);
        vm.expectEmit(true, true, true, true);
        emit CommentDeleted(commentId, author);
        comments.deleteCommentAsAuthor(commentId);
    }

    function test_DeleteComment() public {
        // Create and post a comment first
        ICommentTypes.CommentData memory commentData = _createBasicComment();
        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory authorSignature = _signEIP712(authorPrivateKey, commentId);
        bytes memory appSignature = _signEIP712(appSignerPrivateKey, commentId);

        comments.postComment(commentData, authorSignature, appSignature);

        // Delete the comment with signature
        bytes32 deleteHash = comments.getDeleteCommentHash(
            commentId,
            author,
            appSigner,
            comments.nonces(author, appSigner),
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
            appSigner,
            comments.nonces(author, appSigner),
            block.timestamp + 1 days,
            authorDeleteSignature,
            ""
        );
    }

    function test_DeleteComment_InvalidSignature() public {
        bytes32 commentId = bytes32(uint256(1)); // Any comment ID
        bytes32 deleteHash = comments.getDeleteCommentHash(
            commentId,
            author,
            appSigner,
            comments.nonces(author, appSigner),
            block.timestamp + 1 days
        );
        bytes memory wrongSignature = _signEIP712(wrongPrivateKey, deleteHash); // Wrong signer

        uint256 nonce = comments.nonces(author, appSigner);
        uint256 deadline = block.timestamp + 1 days;

        vm.expectRevert(abi.encodeWithSelector(CommentsV1.NotAuthorized.selector, address(this), author));
        comments.deleteComment(
            commentId,
            author,
            appSigner,
            nonce,
            deadline,
            wrongSignature,
            wrongSignature
        );
    }

    function test_PostCommentAsAuthor_InvalidNonce() public {
        ICommentTypes.CommentData memory commentData = _createBasicComment();
        commentData.nonce = commentData.nonce + 1;

        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory appSignature = _signEIP712(appSignerPrivateKey, commentId);

        vm.prank(author);
        vm.expectRevert(abi.encodeWithSelector(
            CommentsV1.InvalidNonce.selector,
            author,
            appSigner,
            0,
            1
        ));
        comments.postCommentAsAuthor(commentData, appSignature);
    }

    function test_PostComment_InvalidNonce() public {
        ICommentTypes.CommentData memory commentData = _createBasicComment();
        commentData.nonce = commentData.nonce + 1;

        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory authorSignature = _signEIP712(authorPrivateKey, commentId);
        bytes memory appSignature = _signEIP712(appSignerPrivateKey, commentId);

        vm.expectRevert(abi.encodeWithSelector(
            CommentsV1.InvalidNonce.selector,
            author,
            appSigner,
            0,
            1
        ));
        comments.postComment(commentData, authorSignature, appSignature);
    }

    function test_AddApprovalAsAuthor() public {
        vm.prank(author);
        vm.expectEmit(true, true, true, true);
        emit ApprovalAdded(author, appSigner);
        comments.addApprovalAsAuthor(appSigner);

        assertTrue(comments.isApproved(author, appSigner));
    }

    function test_RemoveApprovalAsAuthor() public {
        // First add approval
        vm.prank(author);
        comments.addApprovalAsAuthor(appSigner);

        // Then remove it
        vm.prank(author);
        vm.expectEmit(true, true, true, true);
        emit ApprovalRemoved(author, appSigner);
        comments.removeApprovalAsAuthor(appSigner);

        assertFalse(comments.isApproved(author, appSigner));
    }

    function test_PostComment_WithApproval() public {
        // First add approval
        vm.prank(author);
        comments.addApprovalAsAuthor(appSigner);

        // Create and post comment
        ICommentTypes.CommentData memory commentData = _createBasicComment();
        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory appSignature = _signEIP712(appSignerPrivateKey, commentId);

        // Post comment from any address since we have approval
        comments.postComment(commentData, bytes(""), appSignature);
    }

    function test_PostComment_WithoutApproval() public {
        ICommentTypes.CommentData memory commentData = _createBasicComment();
        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory appSignature = _signEIP712(appSignerPrivateKey, commentId);

        // Should fail without approval or valid signature
        vm.expectRevert(abi.encodeWithSelector(CommentsV1.NotAuthorized.selector, address(this), author));
        comments.postComment(commentData, bytes(""), appSignature);
    }

    function test_AddApproval_WithSignature() public {
        uint256 nonce = 0;
        uint256 deadline = block.timestamp + 1 days;

        bytes32 addApprovalHash = comments.getAddApprovalHash(
            author,
            appSigner,
            nonce,
            deadline
        );
        bytes memory signature = _signEIP712(authorPrivateKey, addApprovalHash);

        vm.prank(author);
        vm.expectEmit(true, true, true, true);
        emit ApprovalAdded(author, appSigner);
        comments.addApproval(author, appSigner, nonce, deadline, signature);

        assertTrue(comments.isApproved(author, appSigner));
    }

    function test_RemoveApproval_WithSignature() public {
        // First add approval
        vm.prank(author);
        comments.addApprovalAsAuthor(appSigner);

        uint256 nonce = 0;
        uint256 deadline = block.timestamp + 1 days;

        bytes32 removeHash = comments.getRemoveApprovalHash(
            author,
            appSigner,
            nonce,
            deadline
        );
        bytes memory signature = _signEIP712(authorPrivateKey, removeHash);

        vm.prank(author);
        vm.expectEmit(true, true, true, true);
        emit ApprovalRemoved(author, appSigner);
        comments.removeApproval(author, appSigner, nonce, deadline, signature);

        assertFalse(comments.isApproved(author, appSigner));
    }

    function test_AddApproval_InvalidNonce() public {
        uint256 wrongNonce = 1;
        uint256 deadline = block.timestamp + 1 days;

        bytes32 addApprovalHash = comments.getAddApprovalHash(
            author,
            appSigner,
            wrongNonce,
            deadline
        );
        bytes memory signature = _signEIP712(authorPrivateKey, addApprovalHash);

        vm.expectRevert(abi.encodeWithSelector(
            CommentsV1.InvalidNonce.selector,
            author,
            appSigner,
            0,
            1
        ));
        comments.addApproval(author, appSigner, wrongNonce, deadline, signature);
    }

    function test_RemoveApproval_InvalidNonce() public {
        vm.prank(author);
        comments.addApprovalAsAuthor(appSigner);

        uint256 wrongNonce = 1;
        uint256 deadline = block.timestamp + 1 days;

        bytes32 removeApprovalHash = comments.getRemoveApprovalHash(
            author,
            appSigner,
            wrongNonce,
            deadline
        );
        bytes memory signature = _signEIP712(
            authorPrivateKey,
            removeApprovalHash
        );

        vm.expectRevert(abi.encodeWithSelector(
            CommentsV1.InvalidNonce.selector,
            author,
            appSigner,
            0,
            1
        ));
        comments.removeApproval(
            author,
            appSigner,
            wrongNonce,
            deadline,
            signature
        );
    }

    function test_DeleteComment_InvalidNonce() public {
        ICommentTypes.CommentData memory commentData = _createBasicComment();
        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory appSignature = _signEIP712(appSignerPrivateKey, commentId);

        vm.prank(author);
        comments.postCommentAsAuthor(commentData, appSignature);

        uint256 wrongNonce = 100;
        uint256 deadline = block.timestamp + 1 days;
        bytes32 deleteHash = comments.getDeleteCommentHash(
            commentId,
            author,
            appSigner,
            wrongNonce,
            deadline
        );
        bytes memory authorDeleteSignature = _signEIP712(
            authorPrivateKey,
            deleteHash
        );

        vm.expectRevert(abi.encodeWithSelector(
            CommentsV1.InvalidNonce.selector,
            author,
            appSigner,
            1,
            100
        ));
        comments.deleteComment(
            commentId,
            author,
            appSigner,
            wrongNonce,
            deadline,
            authorDeleteSignature,
            ""
        );
    }

    function test_DeleteComment_WithApprovedSigner() public {
        // First add approval
        vm.prank(author);
        comments.addApprovalAsAuthor(appSigner);

        // Create and post a comment
        ICommentTypes.CommentData memory commentData = _createBasicComment();
        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory appSignature = _signEIP712(appSignerPrivateKey, commentId);

        vm.prank(author);
        comments.postCommentAsAuthor(commentData, appSignature);

        // Delete the comment with app signature only
        bytes32 deleteHash = comments.getDeleteCommentHash(
            commentId,
            author,
            appSigner,
            comments.nonces(author, appSigner),
            block.timestamp + 1 days
        );
        bytes memory appDeleteSignature = _signEIP712(
            appSignerPrivateKey,
            deleteHash
        );

        vm.expectEmit(true, true, true, true);
        emit CommentDeleted(commentId, author);
        comments.deleteComment(
            commentId,
            author,
            appSigner,
            comments.nonces(author, appSigner),
            block.timestamp + 1 days,
            bytes(""), // Empty author signature
            appDeleteSignature
        );
    }

    function test_PostComment_WithFeeCollection() public {
        // Setup fee collector
        comments.scheduleFeeCollectorChange(address(noFeeCollector), true);
        vm.warp(block.timestamp + 48 hours);
        comments.executeFeeCollectorChange();

        ICommentTypes.CommentData memory commentData = _createBasicComment();
        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory authorSignature = _signEIP712(authorPrivateKey, commentId);
        bytes memory appSignature = _signEIP712(appSignerPrivateKey, commentId);

        // Post comment with fee
        vm.prank(author);
        comments.postComment{value: 0.1 ether}(commentData, authorSignature, appSignature);
    }

    function test_PostComment_WithInvalidFee() public {
        // Setup fee collector that requires 1 ether
        MaliciousFeeCollector maliciousCollector = new MaliciousFeeCollector();
        comments.scheduleFeeCollectorChange(address(maliciousCollector), true);
        vm.warp(block.timestamp + 48 hours);
        comments.executeFeeCollectorChange();

        ICommentTypes.CommentData memory commentData = _createBasicComment();
        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory authorSignature = _signEIP712(authorPrivateKey, commentId);
        bytes memory appSignature = _signEIP712(appSignerPrivateKey, commentId);

        // Try to post comment with insufficient fee
        vm.prank(author);
        vm.expectRevert("Malicious revert");
        comments.postComment{value: 0.1 ether}(commentData, authorSignature, appSignature);
    }

    function test_PostComment_WithThreading() public {
        // Post parent comment
        ICommentTypes.CommentData memory parentComment = _createBasicComment();
        bytes32 parentId = comments.getCommentId(parentComment);
        bytes memory parentAuthorSig = _signEIP712(authorPrivateKey, parentId);
        bytes memory parentAppSig = _signEIP712(appSignerPrivateKey, parentId);

        comments.postComment(parentComment, parentAuthorSig, parentAppSig);

        // Post reply comment
        ICommentTypes.CommentData memory replyComment = _createBasicComment();
        replyComment.parentId = parentId;
        replyComment.nonce = comments.nonces(author, appSigner); // Update nonce
        
        bytes32 replyId = comments.getCommentId(replyComment);
        bytes memory replyAuthorSig = _signEIP712(authorPrivateKey, replyId);
        bytes memory replyAppSig = _signEIP712(appSignerPrivateKey, replyId);

        comments.postComment(replyComment, replyAuthorSig, replyAppSig);

        // Verify thread relationship
        ICommentTypes.CommentData memory storedReply = comments.getComment(replyId);
        assertEq(storedReply.threadId, comments.getComment(parentId).threadId);
    }

    function test_PostComment_InvalidParent() public {
        ICommentTypes.CommentData memory commentData = _createBasicComment();
        commentData.parentId = bytes32(uint256(1)); // Non-existent parent

        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory authorSignature = _signEIP712(authorPrivateKey, commentId);
        bytes memory appSignature = _signEIP712(appSignerPrivateKey, commentId);

        vm.expectRevert("Parent comment does not exist");
        comments.postComment(commentData, authorSignature, appSignature);
    }

    function test_PostComment_ExpiredDeadline() public {
        ICommentTypes.CommentData memory commentData = _createBasicComment();
        commentData.deadline = block.timestamp - 1; // Expired deadline

        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory authorSignature = _signEIP712(authorPrivateKey, commentId);
        bytes memory appSignature = _signEIP712(appSignerPrivateKey, commentId);

        vm.expectRevert(abi.encodeWithSelector(
            CommentsV1.SignatureDeadlineReached.selector,
            commentData.deadline,
            block.timestamp
        ));
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
        ICommentTypes.CommentData memory commentData = _createBasicComment();
        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory authorSignature = _signEIP712(authorPrivateKey, commentId);
        bytes memory appSignature = _signEIP712(appSignerPrivateKey, commentId);

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
        comments.addApprovalAsAuthor(appSigner);
        assertTrue(comments.isApproved(author, appSigner));

        // Post comment without author signature (using approval)
        ICommentTypes.CommentData memory commentData = _createBasicComment();
        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory appSignature = _signEIP712(appSignerPrivateKey, commentId);

        comments.postComment(commentData, bytes(""), appSignature);

        // Remove approval
        vm.prank(author);
        comments.removeApprovalAsAuthor(appSigner);
        assertFalse(comments.isApproved(author, appSigner));

        // Try to post again without approval (should fail)
        commentData.nonce = comments.nonces(author, appSigner);
        commentId = comments.getCommentId(commentData);
        appSignature = _signEIP712(appSignerPrivateKey, commentId);

        vm.expectRevert(abi.encodeWithSelector(CommentsV1.NotAuthorized.selector, address(this), author));
        comments.postComment(commentData, bytes(""), appSignature);
    }

    function test_NonceIncrement() public {
        uint256 initialNonce = comments.nonces(author, appSigner);

        // Post comment
        ICommentTypes.CommentData memory commentData = _createBasicComment();
        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory authorSignature = _signEIP712(authorPrivateKey, commentId);
        bytes memory appSignature = _signEIP712(appSignerPrivateKey, commentId);

        comments.postComment(commentData, authorSignature, appSignature);

        assertEq(comments.nonces(author, appSigner), initialNonce + 1);

        // Try to reuse the same nonce
        vm.expectRevert(abi.encodeWithSelector(
            CommentsV1.InvalidNonce.selector,
            author,
            appSigner,
            initialNonce + 1,
            initialNonce
        ));
        comments.postComment(commentData, authorSignature, appSignature);
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
contract MaliciousFeeCollector is IFeeCollector {
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IFeeCollector).interfaceId;
    }

    function collectFee(ICommentTypes.CommentData calldata) external payable returns (bool) {
        revert("Malicious revert");
    }

    function getFeeAmount(ICommentTypes.CommentData calldata) external pure returns (uint256) {
        return 1 ether;
    }

    function getBalance(address) external pure returns (uint256) {
        return 0;
    }

    function withdraw() external pure returns (bool) {
        return true;
    }
}
