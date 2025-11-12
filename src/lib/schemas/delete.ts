import { SendDeleteCommentRequestPayloadSchema } from "@ecp.eth/shared-signer/schemas/signer-api/delete";
import { augmentZodSchemaWithAllowedChainIdAndChainConfig } from "../helpers";

/**
 * Payload schema for deleting comment gaslessly
 */
export const SendDeleteCommentRequestPayloadRestrictedSchema =
  augmentZodSchemaWithAllowedChainIdAndChainConfig(
    SendDeleteCommentRequestPayloadSchema,
    "delete",
  );
