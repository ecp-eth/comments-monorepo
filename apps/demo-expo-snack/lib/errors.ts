import { ZodError } from "zod";

export class NetworkError extends Error {
  constructor() {
    super("Network error");
  }
}

export class ResponseError extends Error {
  constructor(
    readonly debugMessage: string,
    readonly response: Response
  ) {
    super(`status: ${response.status}\n${debugMessage}`);
  }
}

export async function throwResponseError(response: Response): Promise<never> {
  let debugMessage = "";
  try {
    const json = await response.json();
    debugMessage = JSON.stringify(json);
  } catch {
    debugMessage = await response.text();
  }

  throw new ResponseError(debugMessage, response);
}

export class ResponseSchemaError extends Error {
  constructor(readonly debugMessage: string) {
    super(`Response schema error: \n${debugMessage}`);
  }
}

export function throwResponseSchemaError(zodError: ZodError): never {
  throw new ResponseSchemaError(zodError.message);
}
