import {
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
} from "@/constants";
import { type NextResponse } from "next/server";

export function setTokenCookies({
  response,
  accessToken,
  refreshToken,
}: {
  response: NextResponse;
  accessToken: {
    token: string;
    expiresIn: number;
  };
  refreshToken: {
    token: string;
    expiresIn: number;
  };
}) {
  response.cookies.set({
    name: ACCESS_TOKEN_COOKIE_NAME,
    value: accessToken.token,
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: accessToken.expiresIn,
  });

  response.cookies.set({
    name: REFRESH_TOKEN_COOKIE_NAME,
    value: refreshToken.token,
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: refreshToken.expiresIn,
  });
}
