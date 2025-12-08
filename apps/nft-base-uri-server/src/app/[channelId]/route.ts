import z from "zod";
import { resolveNFTMetadataAsResponse } from "../resolve-nft-metadata";
import { config } from "../config";

const paramsParser = z.object({
  channelId: z.string().transform((val) => z.coerce.bigint().parse(val)),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<z.input<typeof paramsParser>> },
) {
  const paramsResult = paramsParser.safeParse(await params);

  if (!paramsResult.success) {
    return Response.json(paramsResult.error.flatten().fieldErrors, {
      status: 400,
    });
  }

  return resolveNFTMetadataAsResponse(
    config.defaultChain,
    paramsResult.data.channelId,
    request.url,
  );
}
