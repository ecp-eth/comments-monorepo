import {
  SendEditCommentRequestPayloadSchema,
  SignEditCommentRequestPayloadSchema,
} from "@ecp.eth/shared-signer/schemas/signer-api/edit";
import { augmentZodSchemaWithAllowedChainIdAndChainConfig } from "../helpers";

/**
 * Request payload schema for signing comment to edit
 */
export const SignEditCommentRequestPayloadRestrictedSchema =
  augmentZodSchemaWithAllowedChainIdAndChainConfig(
    SignEditCommentRequestPayloadSchema,
    undefined,
  );

/**
 * Request payload schema for submitting comment to edit
 */
export const SendEditCommentRequestPayloadRestrictedSchema =
  augmentZodSchemaWithAllowedChainIdAndChainConfig(
    SendEditCommentRequestPayloadSchema,
    "edit",
  );
