"use client";

import type React from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomTabLayoutProps {
  children: React.ReactNode;
  activeTab?: "discover" | "my-channels";
}

export default function BottomTabLayout({
  children,
  activeTab,
}: BottomTabLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-screen max-w-[400px] mx-auto bg-background">
      <main className="flex-1 overflow-hidden">{children}</main>

      <div className="border-t bg-background">
        <div className="flex">
          <Link
            href="/"
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-3 px-4 text-sm font-medium transition-colors",
              activeTab === "discover" || pathname === "/"
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
              activeTab === "my-channels" || pathname === "/my-channels"
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
