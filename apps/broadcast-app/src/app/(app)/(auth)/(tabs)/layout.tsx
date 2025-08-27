"use client";

import type React from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMiniAppContext } from "@/hooks/useMiniAppContext";

interface BottomTabLayoutProps {
  children: React.ReactNode;
}

export default function BottomTabLayout({ children }: BottomTabLayoutProps) {
  const pathname = usePathname();
  const miniAppContext = useMiniAppContext();

  return (
    <div
      className={cn(
        "flex flex-col h-screen max-w-[400px] mx-auto bg-background",
        miniAppContext.isInMiniApp &&
          miniAppContext.client.safeAreaInsets?.bottom
          ? `pb-[${miniAppContext.client.safeAreaInsets.bottom}px]`
          : "pb-[env(safe-area-inset-bottom)]",
      )}
    >
      <main className="flex-1 overflow-hidden">{children}</main>

      <div className="border-t bg-background">
        <div className="flex">
          <Link
            href="/"
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-3 px-4 text-sm font-medium transition-colors",
              pathname === "/"
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Search className="h-5 w-5 mb-1" />
            Discover
          </Link>

          <Link
            href="/my-channels"
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-3 px-4 text-sm font-medium transition-colors",
              pathname === "/my-channels"
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <User className="h-5 w-5 mb-1" />
            My Channels
          </Link>
        </div>
      </div>
    </div>
  );
}
