import {
  SwapAPIInvalidInputResponseSchemaType,
  SwapAPITokenNotSupportedResponseSchemaType,
  SwapAPIValidationFailedResponseSchemaType,
} from "./schemas";

export class SwapAPILiquidityUnavailableError extends Error {
  constructor() {
    super("Liquidity unavailable");
  }
}

export class SwapAPIUnknownError extends Error {
  constructor(public responseData: unknown) {
    super("Unknown API error");
  }
}

export class SwapAPIInvalidInputError extends Error {
  constructor(public responseData: SwapAPIInvalidInputResponseSchemaType) {
    super("Validation error");
  }
}

export class SwapAPIValidationFailedError extends Error {
  constructor(public responseData: SwapAPIValidationFailedResponseSchemaType) {
    super("Swap validation failed");
  }
}

export class SwapAPITokenNotSupportedError extends Error {
  constructor(public responseData: SwapAPITokenNotSupportedResponseSchemaType) {
    super("Token not supported");
  }
}
