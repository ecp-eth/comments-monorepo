import { env } from "@/env";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  if (!env.ZEROEX_API_KEY) {
    return Response.json({ error: "No API key provided" }, { status: 400 });
  }

  const url = new URL(`https://api.0x.org/swap/permit2/price?${searchParams}`);

  const res = await fetch(url, {
    headers: {
      "0x-api-key": env.ZEROEX_API_KEY,
      "0x-version": "v2",
    },
  });
  const data = await res.json();

  console.log("price api", url.toString());
  console.log("price data", data);

  return Response.json(data, {
    status: res.status,
  });
}
