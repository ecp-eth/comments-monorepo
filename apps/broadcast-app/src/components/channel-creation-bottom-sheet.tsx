"use client";

import { useRef, useState } from "react";
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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  WalletIcon,
  UsersIcon,
  Loader2Icon,
  AlertTriangleIcon,
  RotateCwIcon,
  InfoIcon,
  ImageIcon,
  Upload,
  XIcon,
} from "lucide-react";
import { useAccount, usePublicClient } from "wagmi";
import { ChannelManagerABI } from "@ecp.eth/sdk";
import { CHANNEL_MANAGER_ADDRESS } from "@/wagmi/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BroadcastHookABI } from "@/abi/generated/broadcast-hook-abi";
import { publicEnv } from "@/env/public";
import { ContractFunctionExecutionError, formatEther } from "viem";
import Link from "next/link";
import { useCreateChannel } from "@/hooks/useCreateChannel";
import { useFreshRef } from "@ecp.eth/shared/hooks";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { formatContractFunctionExecutionError } from "@ecp.eth/shared/helpers";
import { useConnectAccount } from "@/hooks/useConnectAccount";

interface ChannelCreationBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChannelCreationBottomSheet({
  isOpen,
  onClose,
}: ChannelCreationBottomSheetProps) {
  const { address } = useAccount();
  const connectAccount = useConnectAccount();
  const publicClient = usePublicClient();
  const onCloseRef = useFreshRef(onClose);
  const [formState, setFormState] = useState<{
    logo: File | null;
    name: string;
    description: string;
  }>({ logo: null, name: "", description: "" });
  const imageInputRef = useRef<HTMLInputElement>(null);

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

  const handleClose = () => {
    onCloseRef.current();
  };

  const createChannel = useCreateChannel();

  const submitMutation = useMutation({
    mutationFn: async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (query.status !== "success") {
        throw new Error("Not ready to create channel");
      }

      if (!query.data.isWhitelisted) {
        throw new Error("You are not whitelisted");
      }

      const channelCreationFee = query.data.channelCreationFee;

      await createChannel.mutateAsync({
        ...formState,
        fee: channelCreationFee,
      });

      onCloseRef.current();
    },
  });

  const renderContent = () => {
    if (!address) {
      return (
        <div className="space-y-4">
          <div className="text-center py-8">
            <WalletIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
            <p className="text-muted-foreground mb-6">
              You need to connect your wallet to create a channel
            </p>
            <Button onClick={() => connectAccount()} className="w-full">
              <WalletIcon className="h-4 w-4 mr-2" />
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
            <UsersIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
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
                <UsersIcon className="h-4 w-4" />
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
          <InfoIcon />
          <AlertTitle className="col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight">
            Channel Creation Fee
          </AlertTitle>
          <AlertDescription className="text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed">
            <span>
              Creating a channel costs{" "}
              <strong>{formatEther(query.data.channelCreationFee)} ETH</strong>{" "}
              to prevent spam and ensure quality.
            </span>
          </AlertDescription>
        </Alert>

        <form className="space-y-4" onSubmit={submitMutation.mutate}>
          <div className="space-y-2">
            <Label>Channel Logo (Optional)</Label>
            <div className="flex items-center space-x-4">
              {formState.logo ? (
                <div className="relative">
                  <img
                    src={URL.createObjectURL(formState.logo)}
                    alt="Channel logo preview"
                    className="w-16 h-16 rounded-full object-cover border-2 border-border"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                    onClick={() => {
                      setFormState({ ...formState, logo: null });

                      if (imageInputRef.current) {
                        imageInputRef.current.value = "";
                      }
                    }}
                  >
                    <XIcon className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div
                  className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50"
                  role="button"
                  tabIndex={0}
                  title="Upload logo"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png,image/svg"
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      logo: e.target.files?.[0] ?? null,
                    })
                  }
                  className="hidden"
                  id="logo-upload"
                  disabled={submitMutation.isPending}
                />
                <Label htmlFor="logo-upload" className="cursor-pointer">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    disabled={submitMutation.isPending}
                    type="button"
                  >
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      {formState.logo ? "Change Logo" : "Upload Logo"}
                    </span>
                  </Button>
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel-name">Channel Name *</Label>
            <Input
              className={cn(isNameInvalid && "border-destructive")}
              id="channel-name"
              placeholder="Enter channel name"
              disabled={submitMutation.isPending}
              name="channel-name"
              value={formState.name}
              onChange={(e) =>
                setFormState({ ...formState, name: e.target.value })
              }
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
              disabled={submitMutation.isPending}
              name="channel-description"
              value={formState.description}
              onChange={(e) =>
                setFormState({ ...formState, description: e.target.value })
              }
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
              disabled={submitMutation.isPending}
              className="w-full gap-2"
              type="submit"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin" />
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
