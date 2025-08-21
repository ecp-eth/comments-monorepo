/**
 * This is a proxy for the broadcast app indexer API.
 *
 * It doesn't need to be used in production but is useful locally when you are testing mini app and using ngrok to run the app locally
 */

import { NextRequest, NextResponse } from "next/server";
import { serverEnv } from "@/env/server";

function callExternal(reqToProxy: NextRequest) {
  const url = new URL(
    reqToProxy.nextUrl.pathname,
    serverEnv.BROADCAST_APP_INDEXER_URL,
  );

  for (const [key, value] of reqToProxy.nextUrl.searchParams.entries()) {
    url.searchParams.set(key, value);
  }

  return fetch(url, {
    headers: reqToProxy.headers,
    method: reqToProxy.method,
    body: reqToProxy.body,
    cache: "no-store",
    // @ts-expect-error - duplex is not a valid property of RequestInit in browser
    duplex: "half",
  });
}

async function proxyRequest(req: NextRequest): Promise<NextResponse> {
  const upstreamResponse = await callExternal(req);

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: upstreamResponse.headers,
  });
}

export async function DELETE(req: NextRequest) {
  return proxyRequest(req);
}

export async function GET(req: NextRequest) {
  return proxyRequest(req);
}

export async function HEAD(req: NextRequest) {
  return proxyRequest(req);
}

export async function PATCH(req: NextRequest) {
  return proxyRequest(req);
}

export async function POST(req: NextRequest) {
  return proxyRequest(req);
}

export async function PUT(req: NextRequest) {
  return proxyRequest(req);
}
