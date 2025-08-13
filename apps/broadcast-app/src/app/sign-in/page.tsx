"use client";
import { Button } from "@/components/ui/button";
import { publicEnv } from "@/env/public";
import { useMutation } from "@tanstack/react-query";
import { SiweMessage } from "siwe";
import {
  injected,
  useAccount,
  useChainId,
  useConnect,
  useSignMessage,
} from "wagmi";
import z from "zod";

export default function SignInPage() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { connectAsync } = useConnect();
  const { signMessageAsync } = useSignMessage();

  const signInMutation = useMutation({
    mutationFn: async () => {
      if (!address) {
        await connectAsync({
          connector: injected(),
        });
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

      const { accessToken, expiresIn } = z
        .object({
          accessToken: z.string(),
          expiresIn: z.number(),
        })
        .parse(verifyResponseData);

      return {
        accessToken,
        expiresIn,
      };
    },
  });

  console.log(signInMutation);

  return (
    <div>
      Sign in
      <Button
        disabled={signInMutation.isPending}
        onClick={() => signInMutation.mutate()}
      >
        Sign in with Ethereum
      </Button>
    </div>
  );
}
