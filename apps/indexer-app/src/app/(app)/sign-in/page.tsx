"use client";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import {
  ConnectAccountError,
  ConnectAccountTimeoutError,
  useConnectAccount,
} from "@ecp.eth/shared/hooks/useConnectAccount";
import { SiweMessage } from "siwe";
import { useChainId, useSignMessage } from "wagmi";
import { Loader2Icon } from "lucide-react";
import {
  siweNonceResponseSchema,
  type SiweVerifyRequest,
  SiweVerifyResponseSchema,
  SiweVerifyRequestSchema,
} from "@/api/schemas/siwe";
import { toast } from "sonner";
import { formatContractFunctionExecutionError } from "@ecp.eth/shared/helpers";
import { ContractFunctionExecutionError, UserRejectedRequestError } from "viem";
import { cn, createFetchUrl } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";

export default function SignInPage() {
  const auth = useAuth();
  const chainId = useChainId();
  const connectAccountUsingRainbowKit = useConnectAccount();
  const { signMessageAsync } = useSignMessage();
  const signInMutation = useMutation({
    mutationFn: async () => {
      const address = await connectAccountUsingRainbowKit();

      if (!address) {
        throw new Error("Could not connect to wallet");
      }

      const nonceResponse = await fetch(createFetchUrl("/api/auth/siwe/nonce"));

      if (!nonceResponse.ok) {
        throw new Error("Failed to get nonce");
      }

      const nonceResponseData = await nonceResponse.json();

      const { nonce, token } = siweNonceResponseSchema.parse(nonceResponseData);

      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: "Sign in with Ethereum to Indexer App",
        uri: window.location.origin,
        version: "1",
        chainId,
        nonce,
      }).prepareMessage();

      const signature = await signMessageAsync({
        message,
      });

      const verifyResponse = await fetch("/api/auth/siwe/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          SiweVerifyRequestSchema.parse({
            message,
            signature,
            token,
          } satisfies SiweVerifyRequest),
        ),
      });

      if (!verifyResponse.ok) {
        throw new Error("Failed to verify signature");
      }

      const verifyResponseData = await verifyResponse.json();

      const { accessToken, refreshToken } =
        SiweVerifyResponseSchema.parse(verifyResponseData);

      return {
        accessToken,
        refreshToken,
      };
    },
    onError(error) {
      if (error instanceof UserRejectedRequestError) {
        toast.error("Please sign the message to continue.");
      } else if (error instanceof ContractFunctionExecutionError) {
        toast.error(formatContractFunctionExecutionError(error));
      } else if (error instanceof ConnectAccountTimeoutError) {
        toast.error("Connecting a wallet timed out");
      } else if (error instanceof ConnectAccountError) {
        toast.error(error.message);
      } else {
        console.error(error);

        toast.error("An unknown error occurred. Please try again.");
      }
    },
    onSuccess(data) {
      auth.updateAccessToken(data.accessToken.token);
    },
  });

  return (
    <div
      className={cn(
        "h-screen max-w-[400px] mx-auto bg-background flex flex-col items-center justify-center p-8 pb-[env(safe-area-inset-bottom)]",
      )}
    >
      <div className="text-center space-y-8">
        {/* App Logo */}
        <div className="space-y-4">
          <div className="w-24 h-24 mx-auto bg-primary rounded-2xl flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 200 200"
              fill="none"
              className="w-12 h-12 text-primary-foreground"
            >
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M171.68 99.978c0 39.792-32.262 72.049-72.059 72.049-15.671 0-30.174-5.002-42-13.497L15.5 161.376l17.108-34.863c-3.256-8.212-5.045-17.164-5.045-26.535 0-39.791 32.262-72.048 72.06-72.048 39.796 0 72.058 32.257 72.058 72.048Zm-42.223-1.568-29.805-50.7-29.804 50.7 29.804 18.544 29.805-18.544Zm-29.805 48.5 29.836-42.546-29.836 18.699-29.897-18.699 29.897 42.546Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">ECP Indexer</h1>
            <p className="text-muted-foreground text-lg">
              Build your apps on ECP Indexer
            </p>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Welcome!</h2>
          <p className="text-muted-foreground max-w-sm">
            Connect your wallet to start building your apps on ECP Indexer.
          </p>
        </div>

        {/* Sign In Button */}
        <div className="pt-4">
          <Button
            onClick={() => signInMutation.mutate()}
            disabled={signInMutation.isPending}
            size="lg"
            className="w-full max-w-sm"
          >
            {signInMutation.isPending ? (
              <>
                <Loader2Icon className="h-5 w-5 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5 mr-2"
                >
                  <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z" />
                </svg>
                Sign with Ethereum
              </>
            )}
          </Button>
        </div>

        {/* Footer Info */}
        <div className="pt-8">
          <p className="text-xs text-muted-foreground">
            By connecting, you agree to our terms of service and privacy policy.
          </p>
        </div>
      </div>
    </div>
  );
}
