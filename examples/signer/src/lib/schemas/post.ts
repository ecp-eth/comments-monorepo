import {
  SendPostCommentRequestPayloadSchema,
  SignPostCommentRequestPayloadSchema,
} from "@ecp.eth/shared-signer/schemas/signer-api/post";
import { augmentZodSchemaWithAllowedChainIdAndChainConfig } from "../helpers";

/**
 * Request payload schema for signing comment to post
 */
export const SignPostCommentRequestPayloadRestrictedSchema =
  augmentZodSchemaWithAllowedChainIdAndChainConfig(
    SignPostCommentRequestPayloadSchema,
    undefined,
  );

/**
 * Request payload schema for submitting comment to post
 */
export const SendPostCommentRequestPayloadRestrictedSchema =
  augmentZodSchemaWithAllowedChainIdAndChainConfig(
    SendPostCommentRequestPayloadSchema,
    "comment",
  );
