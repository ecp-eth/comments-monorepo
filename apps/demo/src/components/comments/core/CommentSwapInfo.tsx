import type { Comment } from "@ecp.eth/shared/schemas";
import Image from "next/image";
import { BASE_TOKENS_BY_ADDRESS } from "../swap-with-comment/0x/constants";

type CommentSwapInfoProps = {
  swap: NonNullable<Comment["zeroExSwap"]>;
};

export function CommentSwapInfo({ swap }: CommentSwapInfoProps) {
  const sellTokenInfo = BASE_TOKENS_BY_ADDRESS[swap.from.address.toLowerCase()];
  const buyTokenInfo = BASE_TOKENS_BY_ADDRESS[swap.to.address.toLowerCase()];

  if (!sellTokenInfo || !buyTokenInfo) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <Image
          alt={sellTokenInfo.symbol}
          className="h-4 w-4 rounded-full"
          src={sellTokenInfo.logoURI}
          width={16}
          height={16}
        />
        <div className="text-sm text-gray-500">
          {swap.from.amount} {sellTokenInfo.symbol}
        </div>
      </div>

      <div className="text-sm text-gray-500">→</div>

      <div className="flex items-center gap-1">
        <Image
          alt={buyTokenInfo.symbol}
          className="h-4 w-4 rounded-full"
          src={buyTokenInfo.logoURI}
          width={16}
          height={16}
        />
        <div className="text-sm text-gray-500">
          {swap.to.amount} {buyTokenInfo.symbol}
        </div>
      </div>
    </div>
  );
}
