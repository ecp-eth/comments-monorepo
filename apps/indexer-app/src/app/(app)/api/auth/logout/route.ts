import { NextResponse } from "next/server";

export async function GET() {
  const response = new NextResponse(null, { status: 204 });

  response.cookies.delete("accessToken");
  response.cookies.delete("refreshToken");

  return response;
}
