import { NextRequest, NextResponse } from "next/server";
import { RefreshAccessTokenResponseSchema } from "@/api/schemas/siwe";
import { serverEnv } from "@/env/server";

export async function POST(request: NextRequest) {
  try {
    // Get the refresh token from cookies
    const refreshToken = request.cookies.get("refreshToken")?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "No refresh token found" },
        { status: 401 },
      );
    }

    // Forward the request to the third-party API
    const thirdPartyResponse = await fetch(
      new URL("/api/auth/siwe/refresh", serverEnv.NEXT_PUBLIC_INDEXER_URL),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${refreshToken}`,
          "Content-Type": "application/json",
          // Forward any relevant headers from the original request
          ...(request.headers.get("user-agent") && {
            "User-Agent": request.headers.get("user-agent")!,
          }),
        },
      },
    );

    if (!thirdPartyResponse.ok) {
      // If the refresh token is invalid, clear the cookies
      if (thirdPartyResponse.status === 401) {
        const response = NextResponse.json(
          { error: "Invalid refresh token" },
          { status: 401 },
        );

        // Clear the cookies
        response.cookies.delete("accessToken");
        response.cookies.delete("refreshToken");

        return response;
      }

      return thirdPartyResponse.clone();
    }

    // Parse and validate the third-party response
    const thirdPartyData = await thirdPartyResponse.json();
    const validatedResponse =
      RefreshAccessTokenResponseSchema.parse(thirdPartyData);

    // Create the response object
    const response = NextResponse.json(validatedResponse);

    // Set httpOnly cookies with the new tokens
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
    console.error("SIWE refresh handler error:", error);

    // Handle validation errors
    if (error instanceof Error && "issues" in error) {
      return NextResponse.json(
        { error: "Invalid response format", details: error },
        { status: 500 },
      );
    }

    // Handle other errors
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
