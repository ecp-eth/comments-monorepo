"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState } from "react";
import { useAccount } from "wagmi";
import { CommentSection } from "@/components/comments/standard/CommentSection";
import { CommentSectionGasless } from "@/components/comments/gasless/CommentSectionGasless";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommentSection as CommentSectionSwapWithComment } from "@/components/comments/swap-with-comment/CommentSection";
import { PoweredBy } from "@ecp.eth/shared/components";

type Tab = "default" | "gasless" | "swap";

export default function Home() {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<Tab>("default");

  return (
    <main className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto flex flex-row justify-between items-center py-2">
        <div className="flex flex-row gap-3">
          <Link
            className="text-sm font-semibold"
            href="https://docs.ethcomments.xyz"
          >
            Documentation
          </Link>
          <Link
            className="text-sm font-semibold"
            href="https://github.com/ecp-eth/comments-monorepo/tree/main/apps/demo"
          >
            Github
          </Link>
        </div>
        <div className="flex flex-row gap-3">
          {address && <ConnectButton />}
        </div>
      </div>
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow">
        <Tabs
          className="mx-auto max-w-2xl w-full flex justify-center"
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as Tab)}
        >
          <TabsList className="overflow-x-auto justify-start">
            <TabsTrigger value="default">Default</TabsTrigger>
            <TabsTrigger value="gasless">
              Gas Sponsored Transactions
            </TabsTrigger>
            <TabsTrigger value="swap">Swap with comment</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="max-w-2xl mx-auto mt-8 flex flex-col gap-4">
          {activeTab === "gasless" ? (
            <CommentSectionGasless />
          ) : activeTab === "swap" ? (
            <CommentSectionSwapWithComment />
          ) : (
            <CommentSection />
          )}
          <PoweredBy />
        </div>
      </div>
    </main>
  );
}
