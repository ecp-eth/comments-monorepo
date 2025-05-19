##### @ecp.eth/protocol

----

# `ProtocolFees`

This contract handles all fee-related functionality including channel creation, hook registration, and transaction fees


Implements fee management with the following features:
1. Fee Configuration:
   - Channel creation fee
   - Hook registration fee
   - Hook transaction fee percentage
2. Fee Collection:
   - Accumulates fees from various operations
   - Allows withdrawal of accumulated fees
3. Fee Updates:
   - Only owner can update fee amounts
   - Fee percentage capped at 100%







## Functions

### `constructor(address initialOwner)` (internal)

Constructor sets the contract owner and initializes fees




### `setChannelCreationFee(uint96 fee)` (external)

Sets the fee for creating a new channel




### `setHookTransactionFee(uint16 feeBasisPoints)` (external)

Sets the fee percentage taken from hook transactions




### `getChannelCreationFee() → uint96` (external)

Gets the current channel creation fee




### `getHookTransactionFee() → uint16` (external)

Gets the current hook transaction fee percentage




### `withdrawFees(address recipient) → uint256 amount` (external)

Withdraws accumulated fees to a specified address




### `collectChannelCreationFee() → uint96` (internal)

Guard against insufficient channel creation fee




### `deductProtocolHookTransactionFee(uint256 value) → uint256 hookValue` (external)

Calculates the hook transaction fee by deducting the protocol fee




### `_collectFee(uint96 requiredFee) → uint96` (internal)

Internal function to guard against insufficient fee






