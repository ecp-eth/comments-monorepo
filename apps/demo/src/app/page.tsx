"use client";

import { CommentSection } from "../components/comments/CommentSection";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { CommentSectionGasless } from "../components/comments/gasless/CommentSectionGasless";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Home() {
  const { address } = useAccount();
  const [isGasless, setIsGasless] = useState(false);

  return (
    <main className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Comments</h1>
          <div className="flex items-center space-x-2">
            <Switch
              id="gasless-mode"
              checked={isGasless}
              onCheckedChange={setIsGasless}
            />
            <Label htmlFor="gasless-mode">Gasless Mode</Label>
          </div>
        </div>
        {!address ? (
          <div className="text-center py-8">
            <ConnectButton />
          </div>
        ) : isGasless ? (
          <CommentSectionGasless />
        ) : (
          <CommentSection />
        )}
      </div>
    </main>
  );
}
