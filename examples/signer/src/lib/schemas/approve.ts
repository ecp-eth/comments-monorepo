import { SendApproveSignerRequestPayloadSchema } from "@ecp.eth/shared/schemas/signer-api/approve";
import { augmentZodSchemaWithAllowedChainIdAndChainConfig } from "../helpers";

/**
 * Request body schema for API that gaslessly adding approval
 */
export const SendApproveSignerRequestPayloadRestrictedSchema =
  augmentZodSchemaWithAllowedChainIdAndChainConfig(
    SendApproveSignerRequestPayloadSchema,
    undefined,
  );
