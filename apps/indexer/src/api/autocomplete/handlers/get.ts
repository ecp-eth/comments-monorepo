import type { IndexerAPIGetAutocompleteOutputSchemaType } from "@ecp.eth/sdk/indexer/schemas";
import type { GetAutocompleteQuerySchemaType } from "../schemas";
import type { Hex } from "viem";
import { ensByAddressResolverService } from "../../../services/ens-by-address-resolver";
import { farcasterByAddressResolverService } from "../../../services/farcaster-by-address-resolver";
import { erc20ByAddressResolverService } from "../../../services/erc20-by-address-resolver";
import { ensByNameResolverService } from "../../../services/ens-by-name-resolver";
import { farcasterByNameResolverService } from "../../../services/farcaster-by-name-resolver";
import { isEthName, isFarcasterFname } from "../../../resolvers";
import {
  extractERC20CAIP19,
  isERC20CAIP19,
  isEthAddress,
} from "../../../lib/utils";
import { ensByQueryResolverService } from "../../../services/ens-by-query-resolver";

export async function getAutocompleteHandler({
  char,
  query,
}: GetAutocompleteQuerySchemaType): Promise<IndexerAPIGetAutocompleteOutputSchemaType> {
  if (char === "@") {
    if (isEthAddress(query)) {
      const ensName = await ensByAddressResolverService.load(query);

      if (ensName) {
        return {
          results: [
            {
              type: "ens",
              name: ensName.name,
              address: ensName.address,
              url: ensName.url,
              avatarUrl: ensName.avatarUrl,
              value: ensName.address,
            },
          ],
        };
      }

      const farcaster = await farcasterByAddressResolverService.load(query);

      if (farcaster) {
        return {
          results: [
            {
              type: "farcaster",
              ...farcaster,
              value: farcaster.address,
            },
          ],
        };
      }

      const token = await erc20ByAddressResolverService.load(query);

      if (token) {
        return {
          results: token.chains.map((chain) => ({
            type: "erc20",
            symbol: token.symbol,
            name: token.name,
            address: query,
            caip19: chain.caip,
            chainId: chain.chainId,
            decimals: token.decimals,
            logoURI: token.logoURI,
            value: chain.caip,
          })),
        };
      }

      return { results: [] };
    } else if (isEthName(query)) {
      const ensName = await ensByNameResolverService.load(query);

      if (ensName) {
        return {
          results: [
            {
              type: "ens",
              name: ensName.name,
              address: ensName.address,
              url: ensName.url,
              avatarUrl: ensName.avatarUrl,
              value: ensName.address,
            },
          ],
        };
      }
    } else if (isFarcasterFname(query)) {
      const farcaster = await farcasterByNameResolverService.load(query);

      if (farcaster) {
        return {
          results: [
            {
              type: "farcaster",
              ...farcaster,
              value: farcaster.address,
            },
          ],
        };
      }
    }

    const results = await ensByQueryResolverService.load(query);

    if (results) {
      return {
        results: results.map((domain) => ({
          type: "ens" as const,
          ...domain,
          value: domain.address,
        })),
      };
    }
  }

  if (isERC20CAIP19(query)) {
    const { address } = extractERC20CAIP19(query);
    const token = await erc20ByAddressResolverService.load(address as Hex);

    if (token) {
      return {
        results: token.chains.map((chain) => ({
          type: "erc20",
          name: token.name,
          address: token.address,
          symbol: token.symbol,
          caip19: chain.caip,
          chainId: chain.chainId,
          decimals: token.decimals,
          logoURI: token.logoURI,
          value: chain.caip,
        })),
      };
    }
  }

  // for now we don't support erc20 mentions until we find some API to properly look for them
  return {
    results: [],
  };

  // so we weren't able to resolve an address so now we don't care what the char actually is and we can just try to search for erc20 tokens
  /* const tokens = await erc20ByQueryResolver.load(query);

  return new JSONResponse(responseSchema, {
    suggestions: tokens.map((token) => ({
      type: "erc20" as const,
      name: token.name,
      address: getAddress(token.address),
      symbol: token.symbol,
      caip19: token.caip19,
      chainId: token.chainId,
    })),
  });*/
}
