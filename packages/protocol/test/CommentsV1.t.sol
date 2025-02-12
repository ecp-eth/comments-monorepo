// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {CommentsV1} from "../src/CommentsV1.sol";

contract CommentsV1Test is Test {
    event CommentDeleted(bytes32 indexed commentId, address indexed author);
    event ApprovalAdded(address indexed approver, address indexed approved);
    event ApprovalRemoved(address indexed approver, address indexed approved);

    CommentsV1 public comments;

    // Test accounts
    address public author;
    address public appSigner;
    uint256 public authorPrivateKey = 0x1;
    uint256 public appSignerPrivateKey = 0x2;
    uint256 public wrongPrivateKey = 0x3;

    function setUp() public {
        comments = new CommentsV1();

        author = vm.addr(authorPrivateKey);
        appSigner = vm.addr(appSignerPrivateKey);

        // Setup private keys for signing
        vm.deal(author, 1 ether);
        vm.deal(appSigner, 1 ether);
    }

    function _createBasicComment()
        internal
        view
        returns (CommentsV1.CommentData memory)
    {
        uint256 nonce = comments.nonces(author);

        return
            CommentsV1.CommentData({
                content: "Test comment",
                metadata: "{}",
                targetUri: "https://example.com",
                parentId: bytes32(0),
                author: author,
                appSigner: appSigner,
                nonce: nonce,
                deadline: block.timestamp + 1 days
            });
    }

    function test_PostCommentAsAuthor() public {
        CommentsV1.CommentData memory commentData = _createBasicComment();
        commentData.appSigner = appSigner;

        // Generate app signature
        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory appSignature = _signEIP712(appSignerPrivateKey, commentId);

        // Send transaction as author
        vm.prank(author);
        comments.postCommentAsAuthor(commentData, appSignature);
    }

    function test_PostCommentAsAuthor_InvalidAuthor() public {
        CommentsV1.CommentData memory commentData = _createBasicComment();
        commentData.appSigner = appSigner;

        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory appSignature = _signEIP712(appSignerPrivateKey, commentId);

        // Send transaction from wrong address
        vm.prank(address(0x3));
        vm.expectRevert(CommentsV1.NotAuthorized.selector);
        comments.postCommentAsAuthor(commentData, appSignature);
    }

    function test_PostComment() public {
        CommentsV1.CommentData memory commentData = _createBasicComment();
        commentData.appSigner = appSigner;

        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory authorSignature = _signEIP712(authorPrivateKey, commentId);
        bytes memory appSignature = _signEIP712(appSignerPrivateKey, commentId);

        comments.postComment(commentData, authorSignature, appSignature);
    }

    function test_PostComment_InvalidAppSignature() public {
        CommentsV1.CommentData memory commentData = _createBasicComment();
        commentData.appSigner = appSigner;

        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory authorSignature = _signEIP712(authorPrivateKey, commentId);
        bytes memory wrongSignature = _signEIP712(0x3, commentId); // Wrong private key

        vm.expectRevert(CommentsV1.InvalidAppSignature.selector);
        comments.postComment(commentData, authorSignature, wrongSignature);
    }

    function test_DeleteCommentAsAuthor() public {
        // Create and post a comment first
        CommentsV1.CommentData memory commentData = _createBasicComment();
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
        CommentsV1.CommentData memory commentData = _createBasicComment();
        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory authorSignature = _signEIP712(authorPrivateKey, commentId);
        bytes memory appSignature = _signEIP712(appSignerPrivateKey, commentId);

        comments.postComment(commentData, authorSignature, appSignature);

        // Delete the comment with signature
        bytes32 deleteHash = comments.getDeleteCommentHash(
            commentId,
            author,
            appSigner,
            comments.nonces(author),
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
            comments.nonces(author),
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
            comments.nonces(author),
            block.timestamp + 1 days
        );
        bytes memory wrongSignature = _signEIP712(wrongPrivateKey, deleteHash); // Wrong signer

        uint256 nonce = comments.nonces(author);
        uint256 deadline = block.timestamp + 1 days;

        vm.expectRevert(CommentsV1.NotAuthorized.selector);
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
        CommentsV1.CommentData memory commentData = _createBasicComment();
        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory appSignature = _signEIP712(appSignerPrivateKey, commentId);

        // Post comment from any address since we have approval
        comments.postComment(commentData, bytes(""), appSignature);
    }

    function test_PostComment_WithoutApproval() public {
        CommentsV1.CommentData memory commentData = _createBasicComment();
        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory appSignature = _signEIP712(appSignerPrivateKey, commentId);

        // Should fail without approval or valid signature
        vm.expectRevert(CommentsV1.NotAuthorized.selector);
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

    function test_PostCommentAsAuthor_InvalidNonce() public {
        CommentsV1.CommentData memory commentData = _createBasicComment();
        commentData.nonce = commentData.nonce + 1;

        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory appSignature = _signEIP712(appSignerPrivateKey, commentId);

        vm.prank(author);
        vm.expectRevert(CommentsV1.InvalidNonce.selector);
        comments.postCommentAsAuthor(commentData, appSignature);
    }

    function test_PostComment_InvalidNonce() public {
        CommentsV1.CommentData memory commentData = _createBasicComment();
        commentData.nonce = commentData.nonce + 1;

        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory authorSignature = _signEIP712(authorPrivateKey, commentId);
        bytes memory appSignature = _signEIP712(appSignerPrivateKey, commentId);

        vm.expectRevert(CommentsV1.InvalidNonce.selector);
        comments.postComment(commentData, authorSignature, appSignature);
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

        vm.prank(author);
        vm.expectRevert(CommentsV1.InvalidNonce.selector);
        comments.addApproval(
            author,
            appSigner,
            wrongNonce,
            deadline,
            signature
        );
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

        vm.prank(author);
        vm.expectRevert(CommentsV1.InvalidNonce.selector);
        comments.removeApproval(
            author,
            appSigner,
            wrongNonce,
            deadline,
            signature
        );
    }

    function test_DeleteComment_InvalidNonce() public {
        CommentsV1.CommentData memory commentData = _createBasicComment();
        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory appSignature = _signEIP712(appSignerPrivateKey, commentId);

        vm.prank(author);
        comments.postCommentAsAuthor(commentData, appSignature);

        uint256 wrongNonce = 0;
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

        vm.expectRevert(CommentsV1.InvalidNonce.selector);
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
        CommentsV1.CommentData memory commentData = _createBasicComment();
        bytes32 commentId = comments.getCommentId(commentData);
        bytes memory appSignature = _signEIP712(appSignerPrivateKey, commentId);

        vm.prank(author);
        comments.postCommentAsAuthor(commentData, appSignature);

        // Delete the comment with app signature only
        bytes32 deleteHash = comments.getDeleteCommentHash(
            commentId,
            author,
            appSigner,
            comments.nonces(author),
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
            comments.nonces(author),
            block.timestamp + 1 days,
            bytes(""), // Empty author signature
            appDeleteSignature
        );
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
