import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
} from "@/constants";
import { serverEnv } from "@/env/server";
import {
  type RefreshAccessTokenResponse,
  refreshAccessTokenResponseSchema,
} from "../../schemas";
import { deleteTokenCookies, setTokenCookies } from "../../utils";

async function refreshAccessToken(
  refreshToken: string,
): Promise<RefreshAccessTokenResponse | NextResponse> {
  const response = await fetch(
    new URL("/api/auth/siwe/refresh", serverEnv.BROADCAST_APP_INDEXER_URL),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${refreshToken}`,
      },
    },
  );

  if (!response.ok) {
    return new NextResponse(null, { status: 401 });
  }

  const json = await response.json();
  const jsonData = refreshAccessTokenResponseSchema.parse(json);

  return jsonData;
}

function callExternal({
  path,
  reqToProxy,
  accessToken,
}: {
  reqToProxy: NextRequest;
  path: string[];
  accessToken: string | undefined;
}) {
  const url = new URL(
    "/" + path.join("/"),
    serverEnv.BROADCAST_APP_INDEXER_URL,
  );

  for (const [key, value] of reqToProxy.nextUrl.searchParams.entries()) {
    url.searchParams.set(key, value);
  }

  return fetch(url, {
    headers: {
      ...reqToProxy.headers,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    method: reqToProxy.method,
    body: reqToProxy.body,
    cache: "no-store",
    // @ts-expect-error - duplex is not a valid property of RequestInit in browser
    duplex: "half",
  });
}

async function proxyRequest(
  req: NextRequest,
  path: string[],
): Promise<NextResponse> {
  const requestCookies = await cookies();
  const accessToken = requestCookies.get(ACCESS_TOKEN_COOKIE_NAME)?.value;
  const refreshToken = requestCookies.get(REFRESH_TOKEN_COOKIE_NAME)?.value;

  const upstreamResponse = await callExternal({
    path,
    reqToProxy: req,
    accessToken,
  });

  let response = new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: upstreamResponse.headers,
  });

  if (upstreamResponse.status === 401 && refreshToken) {
    // try refresh access token by refresh token, if available
    const tokensOrResponse = await refreshAccessToken(refreshToken);

    if (tokensOrResponse instanceof NextResponse) {
      deleteTokenCookies(tokensOrResponse);

      return tokensOrResponse;
    }

    setTokenCookies({
      response,
      accessToken: tokensOrResponse.accessToken,
      refreshToken: tokensOrResponse.refreshToken,
    });

    const retriedUpstreamResponse = await callExternal({
      path,
      reqToProxy: req,
      accessToken: tokensOrResponse.accessToken.token,
    });

    response = new NextResponse(retriedUpstreamResponse.body, {
      status: retriedUpstreamResponse.status,
      headers: retriedUpstreamResponse.headers,
    });
  }

  return response;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(req, (await context.params).path);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(req, (await context.params).path);
}
