import type { Hex } from "@ecp.eth/sdk/core";
import _normalizeUrl from "normalize-url";
import { z } from "zod";
import {
  type ENSNameSchemaType,
  type ERC20CAIP19,
  ERC20Caip19Schema,
  ERC_20_CAIP_19_REGEX,
  type ETHAddressSchemaType,
} from "./schemas.ts";
import type { ENSByNameResolver } from "../resolvers/ens-by-name-resolver.ts";

export function normalizeUrl(url: string) {
  return _normalizeUrl(url, {
    sortQueryParameters: true,
    removeTrailingSlash: true,
    stripHash: true,
    removeSingleSlash: true,
  });
}

/**
 * Transforms comment targetUri
 */
export function transformCommentTargetUri(targetUri: string) {
  let normalizedTargetUri = targetUri.trim().length > 0 ? targetUri : "";

  if (normalizedTargetUri === "") {
    return normalizedTargetUri;
  }

  try {
    const urlObj = new URL(targetUri);
    normalizedTargetUri = normalizeUrl(urlObj.toString());
  } catch (error) {
    console.error(error);
  }
  return normalizedTargetUri;
}

/**
 * Transforms comment parentId
 */
export function transformCommentParentId(parentId: `0x${string}`) {
  return parentId ===
    "0x0000000000000000000000000000000000000000000000000000000000000000" // bytes32(0)
    ? null
    : parentId;
}

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export function isEthAddress(address: string): address is Hex {
  return ETH_ADDRESS_REGEX.test(address);
}

export function isERC20CAIP19(caip19: string): caip19 is ERC20CAIP19 {
  return ERC20Caip19Schema.safeParse(caip19).success;
}

export function extractERC20CAIP19(caip19: ERC20CAIP19): {
  chainId: number;
  address: Hex;
} {
  const match = caip19.match(ERC_20_CAIP_19_REGEX);

  if (!match) {
    throw new Error("Invalid CAIP-19");
  }

  return {
    chainId: z.coerce.number().int().parse(match[1]),
    address: match[2] as Hex,
  };
}

export async function resolveUsersByAddressOrEnsName(
  users: (ETHAddressSchemaType | ENSNameSchemaType)[],
  ensByNameResolver: ENSByNameResolver,
): Promise<ETHAddressSchemaType[]> {
  if (users.length === 0) {
    return [];
  }

  const resolvedUsers: Hex[] = [];
  const usersToResolve: string[] = [];

  for (const user of users) {
    if (user.includes(".")) {
      usersToResolve.push(user);
    } else {
      resolvedUsers.push(user as Hex);
    }
  }

  if (usersToResolve.length > 0) {
    const usersByEnsName = await ensByNameResolver.loadMany(usersToResolve);

    for (const result of usersByEnsName) {
      if (result instanceof Error) {
        throw result;
      }

      if (result == null) {
        continue;
      }

      resolvedUsers.push(result.address);
    }
  }

  return resolvedUsers;
}
