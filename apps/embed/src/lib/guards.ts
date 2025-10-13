import { JSONResponse } from "@ecp.eth/shared/helpers";
import { Hex, VerifyTypedDataParameters, PublicActions, Address } from "viem";
import { env } from "@/env";

export function guardAPIDeadline(deadline?: bigint) {
  if (deadline != null) {
    if (deadline < BigInt(Date.now()) / 1000n) {
      throw JSONResponse.json(
        { error: "Deadline is in the past" },
        { status: 400 },
      );
    }

    if (deadline > BigInt(Date.now() + 24 * 60 * 60 * 1000) / 1000n) {
      throw JSONResponse.json(
        { error: "Deadline is too far in the future" },
        { status: 400 },
      );
    }
  }
}

export function guardNoSubmitterPrivateKey(): Hex {
  if (!env.SUBMITTER_PRIVATE_KEY) {
    throw JSONResponse.json(
      { error: "Submitter private key is not set" },
      { status: 500 },
    );
  }

  return env.SUBMITTER_PRIVATE_KEY;
}

export async function guardAuthorSignature({
  publicClient,
  authorSignature,
  signTypedDataParams,
  authorAddress,
}: {
  // using type inferring here somehow cause excessive type inference errors, had to workaround it using any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  publicClient: PublicActions<any, any, any>;
  authorSignature?: Hex;
  signTypedDataParams: Omit<VerifyTypedDataParameters, "address" | "signature">;
  authorAddress: Address;
}) {
  if (!authorSignature) {
    throw JSONResponse.json(
      { error: "Author signature is required" },
      { status: 400 },
    );
  }

  const verified = await publicClient.verifyTypedData({
    ...signTypedDataParams,
    address: authorAddress,
    signature: authorSignature,
  });

  if (!verified) {
    throw JSONResponse.json(
      { error: "Invalid author signature" },
      { status: 400 },
    );
  }
}
