import { SendRevokeSignerRequestPayloadSchema } from "@ecp.eth/shared/schemas/signer-api/revoke";
import { augmentZodSchemaWithAllowedChainIdAndChainConfig } from "../helpers";

/**
 * Request body schema for API that gaslessly adding approval
 */
export const SendRevokeSignerRequestPayloadRestrictedSchema =
  augmentZodSchemaWithAllowedChainIdAndChainConfig(
    SendRevokeSignerRequestPayloadSchema,
    undefined,
  );
