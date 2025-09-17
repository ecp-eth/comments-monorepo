/**
 * Ethereum Comments Protocol SDK Indexer
 * Functionality for constructing events from webhook requests.
 *
 * @module
 */
export * from "./schemas/index.js";

export type ConstructEventOptions = {
  /**
   * App secret key.
   */
  appSecret: string;
  /**
   * The raw request body.
   *
   * @example Next.js
   * ```json
   * import { constructEvent } from "@ecp.eth/sdk/indexer/webhooks";
   *
   * export function POST(request: Request) {
   *   const event = constructEvent({
   *     appSecret: process.env.APP_SECRET,
   *     requestBody: request.body,
   *     requestSignature: request.headers.get("x-ecp-webhook-signature"),
   *     requestTimestamp: request.headers.get("x-ecp-webhook-timestamp"),
   *   });
   *
   *   // ...
   * }
   * ```
   */
  requestBody: string | Buffer;
  /**
   * The signature from X-ECP-Webhook-Signature header.
   */
  requestSignature: string;
  /**
   * The timestamp from X-ECP-Webhook-Timestamp header.
   */
  requestTimestamp: string;
};

export function constructEvent(options: ConstructEventOptions) {}
