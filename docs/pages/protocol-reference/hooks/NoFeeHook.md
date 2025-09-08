##### @ecp.eth/protocol

----

# `NoFeeHook`

Abstract base contract for hooks that do not require a fee.


Only derive from this contract if the hook absolutely does not require a fee.







## Functions

### supportsInterface(bytes4 interfaceId) → bool (public)





### estimateAddCommentFee([struct Comments.Comment](/protocol-reference/types/Comments#comment), [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry), address) → [struct FeeEstimatable.FeeEstimation](/protocol-reference/types/FeeEstimatable#feeestimation) feeEstimation (external)





### estimateEditCommentFee([struct Comments.Comment](/protocol-reference/types/Comments#comment), [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry), address) → [struct FeeEstimatable.FeeEstimation](/protocol-reference/types/FeeEstimatable#feeestimation) feeEstimation (external)







