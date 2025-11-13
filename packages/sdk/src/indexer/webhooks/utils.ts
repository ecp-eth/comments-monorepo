import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod/v3";
import { AllEventsSchema } from "./schemas/index.js";

export type ConstructEventResult = z.infer<typeof AllEventsSchema>;

const ConstructEventOptionsSchema = z.object({
  /**
   * The app secret key.
   */
  appSecret: z.string().nonempty(),
  /**
   * The request body.
   */
  requestBody: z.string().nonempty(),
  /**
   * The signature from X-ECP-Webhook-Signature header.
   */
  requestSignature: z
    .string()
    .regex(/^v1=[a-f0-9]{64}$/, "Invalid signature format")
    .transform((value) => value.slice(3)),
  /**
   * The timestamp from X-ECP-Webhook-Timestamp header.
   */
  requestTimestamp: z
    .string()
    .or(z.number())
    .transform((value, ctx) => {
      const result = z.coerce.number().int().safeParse(value);

      if (!result.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Invalid timestamp format, should be a number or numeric string",
        });

        return z.NEVER;
      }

      return result.data;
    }),
});

/**
 * Constructs an event from the request body, signature, and timestamp.
 *
 * @example Next.js
 * ```json
 * import { constructEvent } from "@ecp.eth/sdk/indexer/webhooks";
 *
 * export async function POST(request: Request) {
 *   const event = constructEvent({
 *     appSecret: process.env.APP_SECRET,
 *     requestBody: await request.text(),
 *     requestSignature: request.headers.get("x-ecp-webhook-signature"),
 *     requestTimestamp: request.headers.get("x-ecp-webhook-timestamp"),
 *   });
 *
 *   // ...
 * }
 * ```
 * @param options - The options for constructing the event.
 * @returns The event.
 * @throws {InvalidEventSignatureError} If the event signature is invalid.
 * @throws {InvalidRequestBodyError} If the request body is not valid JSON object.
 * @throws {InvalidEventError} If the event is invalid.
 */
export function constructEvent(
  options: z.input<typeof ConstructEventOptionsSchema>,
): ConstructEventResult {
  const { appSecret, requestBody, requestSignature, requestTimestamp } =
    ConstructEventOptionsSchema.parse(options);

  const computedSignature = createSignature(
    requestBody,
    appSecret,
    requestTimestamp,
  );

  const requestSignatureBuffer = Buffer.from(requestSignature, "hex");

  if (
    requestSignatureBuffer.length !== computedSignature.length ||
    !timingSafeEqual(computedSignature, requestSignatureBuffer)
  ) {
    throw new InvalidEventSignatureError();
  }

  const parseBodyResult = z
    .string()
    .transform((value, ctx) => {
      try {
        return z.record(z.any()).parse(JSON.parse(value));
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Body is not valid JSON object",
        });

        return z.NEVER;
      }
    })
    .safeParse(requestBody);

  if (!parseBodyResult.success) {
    throw new InvalidRequestBodyError(parseBodyResult.error.issues);
  }

  const eventParseResult = AllEventsSchema.safeParse(parseBodyResult.data);

  if (!eventParseResult.success) {
    throw new InvalidEventError(eventParseResult.error.issues);
  }

  return eventParseResult.data;
}

const ConstructEventFromRequestOptionsSchema = z.object({
  /**
   * The request to construct the event from.
   */
  request: z.instanceof(Request),
  /**
   * The app secret key.
   */
  appSecret: z.string().nonempty(),
});

/**
 * Constructs an event from a request.
 *
 * @example Next.js
 * ```json
 * import { constructEventFromRequest } from "@ecp.eth/sdk/indexer/webhooks";
 *
 * export async function POST(request: Request) {
 *   const event = await constructEventFromRequest(request);
 *
 *   console.log(event);
 *
 *   // ...
 * }
 * ```
 * @param request - The request to construct the event from.
 * @returns The event.
 * @throws {InvalidEventSignatureError} If the event signature is invalid.
 * @throws {InvalidRequestBodyError} If the request body is not valid JSON object.
 * @throws {InvalidEventError} If the event is invalid.
 */
export async function constructEventFromRequest(
  options: z.input<typeof ConstructEventFromRequestOptionsSchema>,
): Promise<ConstructEventResult> {
  const { request, appSecret } =
    ConstructEventFromRequestOptionsSchema.parse(options);

  return constructEvent({
    appSecret,
    requestBody: await request.clone().text(),
    requestSignature: request.headers.get("X-ECP-Webhook-Signature") as string,
    requestTimestamp: request.headers.get("X-ECP-Webhook-Timestamp") as string,
  });
}

function createSignature(
  body: string,
  appSecret: string,
  timestamp: number,
): Buffer {
  return createHmac("sha256", appSecret)
    .update(`${timestamp}.${body}`)
    .digest();
}

/**
 * Thrown when the event signature is invalid.
 */
export class InvalidEventSignatureError extends Error {
  constructor() {
    super("Invalid event signature");
  }
}

/**
 * Thrown when the request body is not valid JSON object.
 */
export class InvalidRequestBodyError extends Error {
  public readonly details: z.ZodIssue[];

  constructor(details: z.ZodIssue[]) {
    super(
      "Body is not valid JSON object\n\nDetails:\n" +
        JSON.stringify(details, null, 2),
      { cause: details },
    );

    this.details = details;
  }
}

/**
 * Thrown when the event is invalid.
 */
export class InvalidEventError extends Error {
  public readonly details: z.ZodIssue[];

  constructor(details: z.ZodIssue[]) {
    super(
      "Invalid event has been received\n\nDetails:\n" +
        JSON.stringify(details, null, 2),
      { cause: details },
    );

    this.details = details;
  }
}
