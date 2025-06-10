import z from "zod";
import { resolveNFTMetadata } from "../../../resolve-nft-metadata";
import { config } from "../../../config";

const paramsParser = z.object({
  chainId: z.coerce.number().int().positive(),
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

  const chain = config.chains[paramsResult.data.chainId];

  if (!chain) {
    return Response.json({ message: "Chain not found" }, { status: 404 });
  }

  return resolveNFTMetadata(chain, paramsResult.data.channelId, request.url);
}
