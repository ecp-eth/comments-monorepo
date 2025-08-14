"use client";
import { Button } from "@/components/ui/button";
import { publicEnv } from "@/env/public";
import { useMutation } from "@tanstack/react-query";
import { useConnectAccount } from "@ecp.eth/shared/hooks/useConnectAccount";
import { SiweMessage } from "siwe";
import { useAccount, useChainId, useConnect, useSignMessage } from "wagmi";
import z from "zod";
import { useMiniAppContext } from "@/hooks/useMiniAppContext";
import { Loader2Icon } from "lucide-react";

export default function SignInPage() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { isInMiniApp } = useMiniAppContext();
  const connectAccountUsingRainbowKit = useConnectAccount();
  const { connectAsync: connectAccountUsingWagmi, connectors } = useConnect();
  const { signMessageAsync } = useSignMessage();

  const signInMutation = useMutation({
    mutationFn: async () => {
      if (!address) {
        if (isInMiniApp) {
          await connectAccountUsingWagmi({
            connector: connectors[0], // use mini app connector
          });
        } else {
          await connectAccountUsingRainbowKit();
        }
      }

      const nonceResponse = await fetch(
        new URL(
          "/api/auth/siwe/nonce",
          publicEnv.NEXT_PUBLIC_BROADCAST_APP_INDEXER_URL,
        ),
      );

      if (!nonceResponse.ok) {
        throw new Error("Failed to get nonce");
      }

      const nonceResponseData = await nonceResponse.json();

      const { nonce, nonceToken } = z
        .object({
          nonce: z.string(),
          nonceToken: z.string(),
          expiresIn: z.number(),
        })
        .parse(nonceResponseData);

      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: "Sign in with Ethereum to Broadcast App",
        uri: window.location.origin,
        version: "1",
        chainId,
        nonce,
      }).prepareMessage();

      const signature = await signMessageAsync({
        message,
      });

      const verifyResponse = await fetch(
        new URL(
          "/api/auth/siwe/verify",
          publicEnv.NEXT_PUBLIC_BROADCAST_APP_INDEXER_URL,
        ),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message,
            signature,
            token: nonceToken,
          }),
        },
      );

      if (!verifyResponse.ok) {
        throw new Error("Failed to verify signature");
      }

      const verifyResponseData = await verifyResponse.json();

      const { accessToken, refreshToken } = z
        .object({
          accessToken: z.object({
            token: z.string(),
            expiresIn: z.number(),
          }),
          refreshToken: z.object({
            token: z.string(),
            expiresIn: z.number(),
          }),
        })
        .parse(verifyResponseData);

      return {
        accessToken,
        refreshToken,
      };
    },
  });

  return (
    <div>
      Sign in
      <Button
        className="gap-2"
        disabled={signInMutation.isPending}
        onClick={() => signInMutation.mutate()}
      >
        {signInMutation.isPending ? (
          <>
            <Loader2Icon className="animate-spin" /> Signing in...
          </>
        ) : (
          "Sign in with Ethereum"
        )}
      </Button>
    </div>
  );
}
