##### @ecp.eth/protocol

----

# `CommentOps`











## Functions

### createComment(bytes32 commentId, [struct Comments.CreateComment](/protocol-reference/types/Comments#createcomment) commentData, [enum Comments.AuthorAuthMethod](/protocol-reference/types/Comments#authorauthmethod) authMethod, uint256 value, uint96 commentCreationFee, contract IChannelManager channelManager, mapping(bytes32 => struct Comments.Comment) comments, mapping(bytes32 => mapping(bytes32 => bytes)) commentMetadata, mapping(bytes32 => bytes32[]) commentMetadataKeys, mapping(bytes32 => mapping(bytes32 => bytes)) commentHookMetadata, mapping(bytes32 => bytes32[]) commentHookMetadataKeys, address msgSender) (external)

Create a new comment




### editComment(bytes32 commentId, [struct Comments.EditComment](/protocol-reference/types/Comments#editcomment) editData, [enum Comments.AuthorAuthMethod](/protocol-reference/types/Comments#authorauthmethod) authMethod, uint256 value, contract IChannelManager channelManager, mapping(bytes32 => struct Comments.Comment) comments, mapping(bytes32 => mapping(bytes32 => bytes)) commentMetadata, mapping(bytes32 => bytes32[]) commentMetadataKeys, mapping(bytes32 => mapping(bytes32 => bytes)) commentHookMetadata, mapping(bytes32 => bytes32[]) commentHookMetadataKeys, address msgSender) (external)

Edit an existing comment




### deleteComment(bytes32 commentId, address author, contract IChannelManager channelManager, mapping(bytes32 => struct Comments.Comment) comments, mapping(bytes32 => bool) deleted, mapping(bytes32 => mapping(bytes32 => bytes)) commentMetadata, mapping(bytes32 => bytes32[]) commentMetadataKeys, mapping(bytes32 => mapping(bytes32 => bytes)) commentHookMetadata, mapping(bytes32 => bytes32[]) commentHookMetadataKeys, address msgSender, uint256 msgValue) (external)

Delete a comment




### updateCommentHookData(bytes32 commentId, contract IChannelManager channelManager, mapping(bytes32 => struct Comments.Comment) comments, mapping(bytes32 => mapping(bytes32 => bytes)) commentMetadata, mapping(bytes32 => bytes32[]) commentMetadataKeys, mapping(bytes32 => mapping(bytes32 => bytes)) commentHookMetadata, mapping(bytes32 => bytes32[]) commentHookMetadataKeys, address msgSender) (external)

Update hook metadata for a comment






