"use client";

import { redirect } from "next/navigation";
import { useAuth, useAuthProtect } from "@/components/auth-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useMeQuery } from "@/queries/me";
import { ErrorScreen } from "@/components/error-screen";
import { Button } from "@/components/ui/button";
import { Loader2Icon, RotateCwIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isLoggedIn } = useAuth();
  const meQuery = useMeQuery();

  useAuthProtect(meQuery.error);

  if (!isLoggedIn) {
    return redirect("/sign-in");
  }

  if (meQuery.status === "pending") {
    return (
      <div className="flex min-h-svh w-full justify-center items-center">
        <Loader2Icon className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  if (meQuery.status === "error") {
    console.error(meQuery.error);

    return (
      <div className="flex min-h-svh w-full">
        <ErrorScreen
          title="Error fetching your identity"
          description="Please try again later. If the problem persists, please contact support."
          actions={
            <Button
              className="gap-2"
              disabled={meQuery.isRefetching}
              onClick={() => meQuery.refetch()}
            >
              <RotateCwIcon
                className={cn(
                  "h-4 w-4",
                  meQuery.isRefetching && "animate-spin",
                )}
              />
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
