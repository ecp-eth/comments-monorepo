import z from "zod";
import { resolveNFTMetadata } from "../resolve-nft-metadata";
import { config } from "../config";

const paramsParser = z.object({
  channelId: z.coerce.bigint(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<z.infer<typeof paramsParser>> },
) {
  const paramsResult = paramsParser.safeParse(await params);

  if (!paramsResult.success) {
    return Response.json(paramsResult.error.flatten().fieldErrors, {
      status: 400,
    });
  }

  return resolveNFTMetadata(
    config.defaultChain,
    paramsResult.data.channelId,
    request.url,
  );
}
