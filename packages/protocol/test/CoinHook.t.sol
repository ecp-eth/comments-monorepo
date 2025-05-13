// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.20;

// import {Test} from "forge-std/Test.sol";
// import {ChannelManager} from "../src/ChannelManager.sol";
// import {CommentManager} from "../src/CommentManager.sol";
// import {IChannelManager} from "../src/interfaces/IChannelManager.sol";
// import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
// import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// import {TestUtils} from "./utils.sol";
// import {BaseHook} from "../src/hooks/BaseHook.sol";
// import {Hooks} from "../src/libraries/Hooks.sol";
// import {Comments} from "../src/libraries/Comments.sol";

// // Comment token contract that will be created for each top-level comment
// contract CommentToken is ERC20 {
//     address public commentAuthor;
//     bytes32 public commentId;
    
//     constructor(
//         string memory name,
//         string memory symbol,
//         address _commentAuthor,
//         bytes32 _commentId
//     ) ERC20(name, symbol) {
//         commentAuthor = _commentAuthor;
//         commentId = _commentId;
//         // FIXME: setup locked LP position.
//         _mint(_commentAuthor, 1000000 * 10 ** 18); // Mint 1M tokens to comment author
//     }
// }

// // Hook that creates an ERC20 token for each top-level comment
// contract CoinHook is BaseHook {
//     mapping(bytes32 => address) public commentTokens;
//     string public tokenNamePrefix;
//     string public tokenSymbolPrefix;
    
//     event CommentTokenCreated(bytes32 indexed commentId, address tokenAddress);
    
//     constructor(string memory _tokenNamePrefix, string memory _tokenSymbolPrefix) {
//         tokenNamePrefix = _tokenNamePrefix;
//         tokenSymbolPrefix = _tokenSymbolPrefix;
//     }
    
//     function _afterComment(
//         Comments.Comment calldata commentData,
//         address,
//         bytes32 commentId
//     ) internal override returns (string memory commentHookData) {
//         // Only create tokens for top-level comments (parentId is 0)
//         if (commentData.parentId == bytes32(0)) {
//             // Create a unique name and symbol for the token
//             // FIXME: derive these like a bot would - offchain oracle?
//             string memory tokenName = string(abi.encodePacked(tokenNamePrefix, " #", _uint2str(uint256(commentId))));
//             string memory tokenSymbol = string(abi.encodePacked(tokenSymbolPrefix, _uint2str(uint256(commentId))));
            
//             // Deploy new token contract
//             CommentToken newToken = new CommentToken(
//                 tokenName,
//                 tokenSymbol,
//                 commentData.author,
//                 commentId
//             );
            
//             // Store the token address
//             commentTokens[commentId] = address(newToken);
            
//             emit CommentTokenCreated(commentId, address(newToken));
//         }
//         // FIXME: return hookdata
//         return "";
//     }
    
//     function _getHookPermissions() internal pure override returns (Hooks.Permissions memory) {
//         return Hooks.Permissions({
//             afterInitialize: false,
//             afterComment: true,
//             afterDeleteComment: false
//         });
//     }
    
//     // Helper function to convert uint to string
//     function _uint2str(uint256 _i) internal pure returns (string memory) {
//         if (_i == 0) {
//             return "0";
//         }
//         uint256 j = _i;
//         uint256 length;
//         while (j != 0) {
//             length++;
//             j /= 10;
//         }
//         bytes memory bstr = new bytes(length);
//         uint256 k = length;
//         j = _i;
//         while (j != 0) {
//             bstr[--k] = bytes1(uint8(48 + j % 10));
//             j /= 10;
//         }
//         return string(bstr);
//     }
// }

// contract CoinHookTest is Test, IERC721Receiver {
//     using TestUtils for string;

//     CommentManager public comments;
//     ChannelManager public channelManager;
//     CoinHook public coinHook;

//     address public owner;
//     address public user1;
//     address public user2;

//     function setUp() public {
//         owner = address(this);
//         user1 = makeAddr("user1");
//         user2 = makeAddr("user2");

//         // Deploy coin hook
//         coinHook = new CoinHook("Comment Token", "CMT");

//         (comments, channelManager) = TestUtils.createContracts(owner);

//         vm.deal(user1, 100 ether);
//         vm.deal(user2, 100 ether);
//     }

//     function test_CreatesTokenForTopLevelComment() public {
//         // Create channel with coin hook
//         uint256 channelId = channelManager.createChannel{value: 0.02 ether}(
//             "Coin Channel",
//             "Comments become tokens",
//             "{}",
//             address(coinHook)
//         );

//         // Create top-level comment
//         Comments.Comment memory commentData = Comments.Comment({
//             content: "Test comment",
//             metadata: "{}",
//             targetUri: "",
//             commentType: "comment",
//             author: user1,
//             app: user2,
//             channelId: channelId,
//             nonce: comments.getNonce(user1, user2),
//             deadline: block.timestamp + 1 days,
//             parentId: bytes32(0)
//         });

//         // Execute comment and get comment ID
//         vm.prank(user1);
//         bytes32 commentId = comments.createComment(commentData);

//         // Check that a token was created
//         address tokenAddress = coinHook.commentTokens(commentId);
//         assertTrue(tokenAddress != address(0), "Token should be created");

//         // Verify token properties
//         CommentToken token = CommentToken(tokenAddress);
//         assertEq(token.commentAuthor(), user1, "Token author should match comment author");
//         assertEq(token.commentId(), commentId, "Token commentId should match");
//         assertEq(token.balanceOf(user1), 1000000 * 10 ** 18, "Author should receive initial tokens");
//     }

//     function test_DoesNotCreateTokenForReply() public {
//         // Create channel with coin hook
//         uint256 channelId = channelManager.createChannel{value: 0.02 ether}(
//             "Coin Channel",
//             "Comments become tokens",
//             "{}",
//             address(coinHook)
//         );

//         // Create parent comment
//         Comments.Comment memory parentData = Comments.Comment({
//             content: "Parent comment",
//             metadata: "{}",
//             targetUri: "",
//             commentType: "comment",
//             author: user1,
//             app: user2,
//             channelId: channelId,
//             nonce: comments.getNonce(user1, user2),
//             deadline: block.timestamp + 1 days,
//             parentId: bytes32(0)
//         });

//         vm.prank(user1);
//         bytes32 parentId = comments.createComment(parentData);

//         // Create reply comment
//         Comments.Comment memory replyData = Comments.Comment({
//             content: "Reply comment",
//             metadata: "{}",
//             targetUri: "",
//             commentType: "comment",
//             author: user2,
//             app: user2,
//             channelId: channelId,
//             nonce: comments.getNonce(user2, user2),
//             deadline: block.timestamp + 1 days,
//             parentId: parentId
//         });

//         vm.prank(user2);
//         bytes32 replyId = comments.createComment(replyData);

//         // Check that no token was created for the reply
//         address tokenAddress = coinHook.commentTokens(replyId);
//         assertEq(tokenAddress, address(0), "No token should be created for reply");
//     }

//     function onERC721Received(
//         address,
//         address,
//         uint256,
//         bytes calldata
//     ) external pure returns (bytes4) {
//         return IERC721Receiver.onERC721Received.selector;
//     }
// } 