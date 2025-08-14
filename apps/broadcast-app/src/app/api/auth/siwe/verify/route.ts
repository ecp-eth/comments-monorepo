import { serverEnv } from "@/env/server";
import { NextResponse } from "next/server";
import { siweVerifyResponseSchema } from "../../../schemas";
import { setTokenCookies } from "../../../utils";

export async function POST(req: Request) {
  const response = await fetch(
    new URL("/api/auth/siwe/verify", serverEnv.BROADCAST_APP_INDEXER_URL),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: req.body,
      // @ts-expect-error - duplex is not a valid property of RequestInit in browser
      duplex: "half",
    },
  );

  if (!response.ok) {
    return response.clone();
  }

  const json = await response.json();
  const jsonData = siweVerifyResponseSchema.parse(json);

  const res = NextResponse.json(jsonData);

  setTokenCookies({
    response: res,
    accessToken: jsonData.accessToken,
    refreshToken: jsonData.refreshToken,
  });

  return res;
}
