##### @ecp.eth/protocol

----

# `IProtocolFees`

This interface defines functions for managing various protocol fees







## Events

### `ChannelCreationFeeUpdated(uint96 newFee)`

Emitted when channel creation fee is updated




### `CommentCreationFeeUpdated(uint96 newFee)`

Emitted when comment creation fee is updated




### `HookTransactionFeeUpdated(uint16 newBasisPoints)`

Emitted when hook transaction fee percentage is updated




### `FeesWithdrawn(address recipient, uint256 amount)`

Emitted when fees are withdrawn





## Functions

### setChannelCreationFee(uint96 fee) (external)

Sets the fee for creating a new channel




### getChannelCreationFee() → uint96 fee (external)

Gets the current channel creation fee




### setCommentCreationFee(uint96 fee) (external)

Sets the fee for creating a new comment




### getCommentCreationFee() → uint96 fee (external)

Gets the current comment creation fee




### setHookTransactionFee(uint16 feeBasisPoints) (external)

Sets the fee percentage taken from hook transactions




### getHookTransactionFee() → uint16 feeBasisPoints (external)

Gets the current hook transaction fee percentage




### withdrawFees(address recipient) → uint256 amount (external)

Withdraws accumulated fees to a specified address




### collectCommentCreationFee() → uint96 (external)

Collects the protocol fee for comment creation




### deductProtocolHookTransactionFee(uint256 value) → uint256 hookValue (external)

Calculates the hook transaction fee by deducting the protocol fee




### calculateMsgValueWithHookFee(uint256 postFeeAmountForwardedToHook) → uint256 (external)

Calculates the required input value to achieve a desired output after protocol fee deduction






