"use client";

import { useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Wallet,
  Users,
  Loader2,
  Info,
  AlertTriangleIcon,
  Loader2Icon,
  RotateCwIcon,
} from "lucide-react";
import { useAccount, useConnect, usePublicClient } from "wagmi";
import { ChannelManagerABI } from "@ecp.eth/sdk";
import { CHANNEL_MANAGER_ADDRESS } from "@/wagmi/client";
import { useQuery } from "@tanstack/react-query";
import { BroadcastHookABI } from "@/abi/generated/broadcast-hook-abi";
import { publicEnv } from "@/env/public";
import { ContractFunctionExecutionError, formatEther } from "viem";
import Link from "next/link";
import { useCreateChannel } from "@/hooks/useCreateChannel";
import { useFreshRef } from "@ecp.eth/shared/hooks";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { formatContractFunctionExecutionError } from "@ecp.eth/shared/helpers";

interface ChannelCreationBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChannelCreationBottomSheet({
  isOpen,
  onClose,
}: ChannelCreationBottomSheetProps) {
  const { address } = useAccount();
  const { connect, connectors } = useConnect();
  const publicClient = usePublicClient();
  const onCloseRef = useFreshRef(onClose);

  const query = useQuery({
    enabled: !!address,
    queryKey: ["channel-creation-eligibility", address],
    queryFn: async () => {
      if (!publicClient) {
        throw new Error("Public client not found");
      }

      const channelCreationFee = await publicClient.readContract({
        abi: ChannelManagerABI,
        address: CHANNEL_MANAGER_ADDRESS,
        functionName: "getChannelCreationFee",
      });

      const isWhitelisted = await publicClient.readContract({
        abi: BroadcastHookABI,
        address: publicEnv.NEXT_PUBLIC_BROADCAST_HOOK_ADDRESS,
        functionName: "isWhitelisted",
        args: [address!],
      });

      return {
        channelCreationFee,
        isWhitelisted,
      };
    },
  });

  const handleConnectWallet = async () => {
    connect({
      connector: connectors[0],
    });
  };

  const handleClose = () => {
    onCloseRef.current();
  };

  const createChannel = useCreateChannel();

  const handleCreateChannelSubmit = useCallback(
    async (formData: FormData, channelCreationFee: bigint) => {
      const name = formData.get("channel-name") as string;
      const description = formData.get("channel-description") as string;

      await createChannel.mutateAsync({
        name,
        description,
        fee: channelCreationFee,
      });

      onCloseRef.current();
    },
    [createChannel, onCloseRef],
  );

  const renderContent = () => {
    if (!address) {
      return (
        <div className="space-y-4">
          <div className="text-center py-8">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
            <p className="text-muted-foreground mb-6">
              You need to connect your wallet to create a channel
            </p>
            <Button onClick={handleConnectWallet} className="w-full">
              <Wallet className="h-4 w-4 mr-2" />
              Connect Wallet
            </Button>
          </div>
        </div>
      );
    }

    if (query.status === "pending") {
      return (
        <div className="space-y-4">
          <div className="text-center py-8">
            <Loader2Icon className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-spin" />
            <h3 className="text-lg font-semibold mb-2">Checking Eligibility</h3>
            <p className="text-muted-foreground">
              Verifying your whitelist status and fetching current fees...
            </p>
          </div>
        </div>
      );
    }

    if (query.status === "error") {
      console.error(query.error);
      return (
        <div className="space-y-4">
          <div className="text-center py-8">
            <AlertTriangleIcon className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">Connection Failed</h3>
            <p className="text-muted-foreground mb-6">
              We couldn&apos;t verify your eligibility. Please check your
              connection and try again.
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => query.refetch()}
                disabled={query.isRefetching}
                className="w-full gap-2"
              >
                <RotateCwIcon className="h-4 w-4" />
                Retry
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
                className="w-full bg-transparent"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (!query.data.isWhitelisted) {
      return (
        <div className="space-y-4">
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Join the Waitlist</h3>
            <p className="text-muted-foreground mb-6">
              Channel creation is currently limited to whitelisted users. Join
              our waitlist to get early access.
            </p>

            <Button asChild className="w-full gap-2">
              <Link
                href="https://t.me/davidfurlong"
                rel="noopener noreferrer"
                target="_blank"
              >
                <Users className="h-4 w-4" />
                Join waitlist
              </Link>
            </Button>
          </div>
        </div>
      );
    }

    const submitError =
      createChannel.error instanceof Error &&
      !(createChannel.error instanceof z.ZodError);

    const getFieldErrors = (field: string) => {
      if (
        !createChannel.isError ||
        !(createChannel.error instanceof z.ZodError)
      ) {
        return [];
      }

      const fieldErrors = createChannel.error.flatten().fieldErrors[field];

      return fieldErrors ?? [];
    };

    const nameErrors = getFieldErrors("name");
    const descriptionErrors = getFieldErrors("description");

    const isNameInvalid = nameErrors.length > 0;
    const isDescriptionInvalid = descriptionErrors.length > 0;

    return (
      <div className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Creating a channel costs{" "}
            <strong>{formatEther(query.data.channelCreationFee)} ETH</strong> to
            prevent spam and ensure quality.
          </AlertDescription>
        </Alert>

        <form
          className="space-y-4"
          action={(formData) =>
            handleCreateChannelSubmit(
              formData,
              query.data.channelCreationFee,
            ).catch(() => {})
          }
        >
          <div className="space-y-2">
            <Label htmlFor="channel-name">Channel Name *</Label>
            <Input
              className={cn(isNameInvalid && "border-destructive")}
              id="channel-name"
              placeholder="Enter channel name"
              disabled={createChannel.isPending}
              name="channel-name"
            />
            {isNameInvalid && (
              <p className="text-xs text-destructive">
                {nameErrors.join(", ")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel-description">Description (Optional)</Label>
            <Textarea
              className={cn(
                "min-h-[80px] resize-none",
                isDescriptionInvalid && "border-destructive",
              )}
              id="channel-description"
              placeholder="Describe what your channel is about..."
              disabled={createChannel.isPending}
              name="channel-description"
            />
            {isDescriptionInvalid && (
              <p className="text-xs text-destructive">
                {descriptionErrors.join(", ")}
              </p>
            )}
          </div>

          <div className="pt-4 space-y-2">
            {submitError && (
              <span className="text-destructive text-xs">
                Could not create channel:{" "}
                {createChannel.error instanceof ContractFunctionExecutionError
                  ? formatContractFunctionExecutionError(createChannel.error)
                  : createChannel.error!.message}
              </span>
            )}
            <Button
              disabled={createChannel.isPending}
              className="w-full gap-2"
              type="submit"
            >
              {createChannel.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Channel...
                </>
              ) : (
                <>
                  Create Channel ({formatEther(query.data.channelCreationFee)}{" "}
                  ETH)
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="max-w-[400px] mx-auto">
        <SheetHeader>
          <SheetTitle>Create Channel</SheetTitle>
        </SheetHeader>

        <div className="mt-4">{renderContent()}</div>
      </SheetContent>
    </Sheet>
  );
}
