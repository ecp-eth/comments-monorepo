"use client";
import { redirect } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { useSyncMiniAppNotificationSettings } from "@/hooks/useSyncMiniAppNotificationSettings";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return redirect("/sign-in");
  }

  return (
    <>
      <SyncMiniAppNotificationSettings />
      {children}
    </>
  );
}

function SyncMiniAppNotificationSettings() {
  // sync notifications state to the server, this is just to keep track of their state
  // this happens only here because if the api returns 401 it throws and the user will be redirected to sign in
  // and we don't want to cause infinite redirect loop
  useSyncMiniAppNotificationSettings();

  return null;
}
