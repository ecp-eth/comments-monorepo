##### @ecp.eth/protocol

----

# `Metadata`





## Structs

### `MetadataEntry`

Struct containing metadata key-value pair





- **key:** (bytes32) UTF-8 encoded string of format "type key". Must fit in 32 bytes.



- **value:** (bytes) The metadata value as bytes


### `MetadataEntryOp`

Struct for hook metadata operations with explicit operation type





- **operation:** (enum Metadata.MetadataOperation) The operation to perform (SET or DELETE)



- **key:** (bytes32) The metadata key



- **value:** (bytes) The metadata value (ignored for DELETE operations)









## Enums

### `MetadataOperation`


SET


DELETE


