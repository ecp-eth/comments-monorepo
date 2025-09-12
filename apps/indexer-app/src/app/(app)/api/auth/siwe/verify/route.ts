import { NextRequest, NextResponse } from "next/server";
import {
  SiweVerifyRequestSchema,
  SiweVerifyResponseSchema,
} from "@/api/schemas/siwe";
import { serverEnv } from "@/env/server";

export async function POST(request: NextRequest) {
  try {
    // Parse and validate the incoming request body
    const body = await request.json();
    const validatedRequest = SiweVerifyRequestSchema.parse(body);

    // Forward the request to the third-party API
    const thirdPartyResponse = await fetch(
      new URL("/api/auth/siwe/verify", serverEnv.NEXT_PUBLIC_INDEXER_URL),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Forward any relevant headers from the original request
          ...(request.headers.get("user-agent") && {
            "User-Agent": request.headers.get("user-agent")!,
          }),
        },
        body: JSON.stringify(validatedRequest),
      },
    );

    if (!thirdPartyResponse.ok) {
      return thirdPartyResponse.clone();
    }

    // Parse and validate the third-party response
    const thirdPartyData = await thirdPartyResponse.json();
    const validatedResponse = SiweVerifyResponseSchema.parse(thirdPartyData);

    // Create the response object
    const response = NextResponse.json(validatedResponse);

    // Set httpOnly cookies with the tokens
    const accessTokenMaxAge = Math.floor(
      (validatedResponse.accessToken.expiresAt - Date.now()) / 1000,
    );
    const refreshTokenMaxAge = Math.floor(
      (validatedResponse.refreshToken.expiresAt - Date.now()) / 1000,
    );

    // Set access token cookie
    response.cookies.set("accessToken", validatedResponse.accessToken.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: accessTokenMaxAge > 0 ? accessTokenMaxAge : 0,
      path: "/",
    });

    // Set refresh token cookie
    response.cookies.set("refreshToken", validatedResponse.refreshToken.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: refreshTokenMaxAge > 0 ? refreshTokenMaxAge : 0,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("SIWE verify handler error:", error);

    // Handle validation errors
    if (error instanceof Error && "issues" in error) {
      return NextResponse.json(
        { error: "Invalid request format", details: error },
        { status: 400 },
      );
    }

    // Handle other errors
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
