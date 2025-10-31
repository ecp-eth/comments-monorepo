import z from "zod";
import { SiweMessage } from "siwe";
import { getIndexerURL } from "@/lib/utils";
import { usePendingWalletConnectionActionsContext } from "@ecp.eth/shared/components";
import { useCallback, useEffect } from "react";
import { useAccount, useAccountEffect, useConfig } from "wagmi";
import { chain } from "@/lib/clientWagmi";
import {
  IndexerSIWEVerifyRequestPayloadSchema,
  IndexerSIWEVerifyResponseBodySchema,
} from "@ecp.eth/shared/schemas/indexer-siwe-api/verify";
import { getWalletClient } from "@wagmi/core";
import { SIWETokens } from "../SIWELoginProvider";
import { useFreshRef } from "@ecp.eth/shared/hooks";
import { useCommentGaslessContext } from "../CommentGaslessProvider";

/**
 * Call this hook to make sure user is SIWE-logged in after wallet is connected
 *
 * @param siweTokensRef
 * @param onSuccess
 */
export function useSIWELogin(
  siweTokensRef: React.RefObject<SIWETokens | undefined>,
  onSuccess: (tokens: SIWETokens) => void,
) {
  const { address: connectedAddress } = useAccount();
  const wagmiConfig = useConfig();

  const pendingWalletConnectionActions =
    usePendingWalletConnectionActionsContext();
  const onSuccessRef = useFreshRef(onSuccess);
  const gaslessContextValue = useCommentGaslessContext();

  const handleSIWELogin = useCallback(async () => {
    if (!connectedAddress) {
      return;
    }

    if (siweTokensRef.current) {
      return;
    }

    if (!gaslessContextValue.areApprovalsEnabled) {
      return;
    }

    if (!gaslessContextValue.isApproved) {
      // no need to sign in if we are not gonna use preapproved flow
      return;
    }

    const nonceResponse = await fetch(getIndexerURL("/api/auth/siwe/nonce"));

    if (!nonceResponse.ok) {
      throw new Error("Failed to get nonce");
    }

    const nonceResponseData = await nonceResponse.json();

    const { nonce, token: nonceToken } = z
      .object({
        nonce: z.string(),
        token: z.string(),
      })
      .parse(nonceResponseData);

    const message = new SiweMessage({
      domain: window.location.host,
      address: connectedAddress,
      statement: "Sign in with Ethereum to comment on ECP Demo",
      uri: window.location.origin,
      version: "1",
      chainId: chain.id,
      nonce,
    }).prepareMessage();

    const walletClient = getWalletClient(wagmiConfig);

    const signature = await (
      await walletClient
    ).signMessage({
      message,
    });

    const verifyResponse = await fetch(getIndexerURL("/api/auth/siwe/verify"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        signature,
        token: nonceToken,
      } satisfies z.input<typeof IndexerSIWEVerifyRequestPayloadSchema>),
    });

    if (!verifyResponse.ok) {
      throw new Error("Failed to verify signature");
    }

    const verifyResponseData = await verifyResponse.json();

    const { accessToken, refreshToken } =
      IndexerSIWEVerifyResponseBodySchema.parse(verifyResponseData);

    onSuccessRef.current({
      address: connectedAddress,
      accessToken,
      refreshToken,
    });
  }, [
    connectedAddress,
    gaslessContextValue.areApprovalsEnabled,
    gaslessContextValue.isApproved,
    onSuccessRef,
    siweTokensRef,
    wagmiConfig,
  ]);

  useAccountEffect({
    onConnect: () => {
      handleSIWELogin();
    },
  });

  useEffect(() => {
    pendingWalletConnectionActions.onAfterConnect = async () => {
      await handleSIWELogin();
    };
  }, [handleSIWELogin, pendingWalletConnectionActions]);
}
