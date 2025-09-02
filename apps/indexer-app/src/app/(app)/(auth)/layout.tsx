"use client";

import { redirect } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useMeQuery } from "@/queries/me";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isLoggedIn } = useAuth();
  const meQuery = useMeQuery({
    enabled: isLoggedIn,
  });

  if (!isLoggedIn) {
    return redirect("/sign-in");
  }

  if (meQuery.status === "pending") {
    // @todo loading screen
    return null;
  }

  if (meQuery.status === "error") {
    // @todo if error is different than UnauthorizedError, show error page
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
