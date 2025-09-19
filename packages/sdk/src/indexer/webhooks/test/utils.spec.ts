import { describe, it, expect } from "vitest";
import {
  constructEvent,
  constructEventFromRequest,
  InvalidEventError,
  InvalidEventSignatureError,
  InvalidRequestBodyError,
} from "../utils.js";
import { createHmac, randomUUID } from "node:crypto";
import { TestEvent } from "../schemas/test.js";

function createSignature(
  data: Buffer | string,
  appSecret: string,
): {
  requestTimestamp: string;
  requestSignature: string;
} {
  const requestTimestamp = Date.now().toString();
  const requestSignature = createHmac("sha256", appSecret)
    .update(`${requestTimestamp}.${data}`)
    .digest("hex");

  return {
    requestTimestamp,
    requestSignature: `v1=${requestSignature}`,
  };
}

const appSecret = "s3cr3t";

describe("constructEvent", () => {
  it("throws if signature is not correct", () => {
    const requestBody = "{}";
    const signatureProps = createSignature(requestBody, appSecret);

    expect(() => {
      constructEvent({
        requestBody,
        ...signatureProps,
        appSecret: "other",
      });
    }).toThrowError(InvalidEventSignatureError);
  });

  it("throws if the request body is not a JSON object", () => {
    const requestBody = "not a JSON object";
    const signatureProps = createSignature(requestBody, appSecret);

    expect(() => {
      constructEvent({
        requestBody,
        ...signatureProps,
        appSecret,
      });
    }).toThrowError(InvalidRequestBodyError);
  });

  it("throws if the event is not known", () => {
    const requestBody = JSON.stringify({
      event: "unknown-event",
    });
    const signatureProps = createSignature(requestBody, appSecret);

    expect(() => {
      constructEvent({
        requestBody,
        ...signatureProps,
        appSecret,
      });
    }).toThrowError(InvalidEventError);
  });

  it("throws if the event type is known but the version does not match", () => {
    const requestBody = JSON.stringify({
      event: "test",
      version: 2,
    });
    const signatureProps = createSignature(requestBody, appSecret);

    expect(() => {
      constructEvent({
        requestBody,
        ...signatureProps,
        appSecret,
      });
    }).toThrowError(InvalidEventError);
  });

  it("parses valid event", () => {
    const appId = randomUUID();
    const webhookId = randomUUID();
    const requestBody = JSON.stringify({
      event: "test",
      version: 1,
      appId,
      webhookId,
      data: {
        message: "message",
      },
      uid: "uid",
    } satisfies TestEvent);
    const signatureProps = createSignature(requestBody, appSecret);

    const event = constructEvent({
      requestBody,
      ...signatureProps,
      appSecret,
    });

    expect(event).toStrictEqual({
      event: "test",
      version: 1,
      uid: "uid",
      appId,
      webhookId,
      data: {
        message: "message",
      },
    });
  });
});

describe("constructEventFromRequest", () => {
  it("constructs an event from a request", async () => {
    const appId = randomUUID();
    const webhookId = randomUUID();
    const requestBody = JSON.stringify({
      event: "test",
      version: 1,
      appId,
      webhookId,
      data: {
        message: "message",
      },
      uid: "uid",
    } satisfies TestEvent);
    const signatureProps = createSignature(requestBody, appSecret);

    const request = new Request("http://localhost", {
      method: "POST",
      body: requestBody,
      headers: {
        "content-type": "application/json",
        "X-ECP-Webhook-Signature": signatureProps.requestSignature,
        "X-ECP-Webhook-Timestamp": signatureProps.requestTimestamp,
      },
    });

    const event = await constructEventFromRequest({
      request,
      appSecret,
    });

    expect(event).toStrictEqual({
      event: "test",
      version: 1,
      uid: "uid",
      appId,
      webhookId,
      data: {
        message: "message",
      },
    });
  });
});
