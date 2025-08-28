"use client";

import type React from "react";

interface BottomTabLayoutProps {
  children: React.ReactNode;
}

export default function BottomTabLayout({ children }: BottomTabLayoutProps) {
  return (
    <div className="flex flex-col h-screen max-w-[400px] mx-auto bg-background">
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
