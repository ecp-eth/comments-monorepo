import { z } from "zod/v3";

/**
 * A typed json response
 */
export class JSONResponse<TSchema extends z.ZodType> extends Response {
  // branded type so it doesn't allow to assign a different schema
  private __outputType!: z.output<TSchema>;

  constructor(
    parser: TSchema,
    data: z.input<TSchema>,
    init?: ResponseInit & {
      jsonReplacer?: (key: string, value: unknown) => unknown;
    },
  ) {
    const { jsonReplacer, ...responseInit } = init || {};

    super(JSON.stringify(parser.parse(data), jsonReplacer), {
      ...responseInit,
      headers: {
        ...responseInit?.headers,
        "Content-Type": "application/json",
      },
    });
  }
}
