##### @ecp.eth/protocol

----

# `Metadata`





## Structs

### `MetadataEntry`


- **key:** (bytes32) UTF-8 encoded string of format "type key". Must fit in 32 bytes.



- **value:** (bytes) The metadata value as bytes


### `MetadataEntryOp`


- **operation:** (enum Metadata.MetadataOperation) The operation to perform (SET or DELETE)



- **key:** (bytes32) The metadata key



- **value:** (bytes) The metadata value (ignored for DELETE operations)









## Enums

### `MetadataOperation`








