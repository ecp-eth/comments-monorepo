##### @ecp.eth/protocol

----

# `IFeeEstimatableHook`











## Functions

### estimateAddCommentFee([struct Comments.Comment](/protocol-reference/types/Comments#comment) commentData, [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) metadata, address msgSender) → [struct FeeEstimatable.FeeEstimation](/protocol-reference/types/FeeEstimatable#feeestimation) feeEstimation (external)

Should return the fee estimation for adding a comment




### estimateEditCommentFee([struct Comments.Comment](/protocol-reference/types/Comments#comment) commentData, [struct Metadata.MetadataEntry[]](/protocol-reference/types/Metadata#metadataentry) metadata, address msgSender) → [struct FeeEstimatable.FeeEstimation](/protocol-reference/types/FeeEstimatable#feeestimation) feeEstimation (external)

Should return the fee estimation for editing a comment






